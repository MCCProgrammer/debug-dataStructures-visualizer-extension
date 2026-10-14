// ============================================================================
// DEBUG ADAPTER PROTOCOL INTEGRATION
// ============================================================================

import * as vscode from 'vscode';
import { VariableLocation } from './types';

// Thread that reported the last "stopped" event, per debug session
const stoppedThreads = new Map<string, number>();

export function rememberStoppedThread(sessionId: string, threadId: number | undefined) {
	if (threadId !== undefined) {
		stoppedThreads.set(sessionId, threadId);
	}
}

/**
 * Gets the current frame ID from the active debug session
 */
export async function getCurrentFrameId(): Promise<number | undefined> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		return undefined;
	}

	// Frame or thread selected in the Call Stack view (VS Code 1.90+)
	const stackItem = (vscode.debug as any).activeStackItem;
	const selected = stackItem && stackItem.session && stackItem.session.id === debugSession.id ? stackItem : undefined;
	if (selected && selected.frameId !== undefined) {
		return selected.frameId;
	}

	try {
		// First, get threads to find the active thread
		const threadsResponse = await debugSession.customRequest('threads', {});
		let threads: any[] = [];
		
		if (threadsResponse && threadsResponse.threads) {
			threads = threadsResponse.threads;
		} else if (threadsResponse && threadsResponse.body && threadsResponse.body.threads) {
			threads = threadsResponse.body.threads;
		}

		// Selected thread, else the one that stopped, else the first one
		const threadId = selected?.threadId
			?? stoppedThreads.get(debugSession.id)
			?? (threads && threads.length > 0 ? threads[0].id : 1);

		// Get stack trace to find the current frame
		const response = await debugSession.customRequest('stackTrace', {
			threadId: threadId
		});

		// Handle different response formats
		let stackFrames: any[] = [];
		if (response && response.stackFrames) {
			stackFrames = response.stackFrames;
		} else if (response && response.body && response.body.stackFrames) {
			stackFrames = response.body.stackFrames;
		}

		// Return the first frame ID (current frame)
		if (stackFrames && stackFrames.length > 0 && stackFrames[0].id !== undefined) {
			return stackFrames[0].id;
		}
	} catch (error) {
		// If we can't get stack trace, try without frameId
		// The debugger will use the current frame implicitly
		console.warn('Could not get stack trace, will try without frameId:', error);
	}

	return undefined;
}

/**
 * Gets a variable value from the debugger using DAP evaluate
 */
export async function evaluateVariable(expression: string, frameId?: number): Promise<any> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}

	// If no frameId provided, try to get the current frame
	let actualFrameId = frameId;
	if (actualFrameId === undefined) {
		actualFrameId = await getCurrentFrameId();
	}

	try {
		const response = await debugSession.customRequest('evaluate', {
			expression: expression,
			frameId: actualFrameId,
			context: 'variables'
		});
		
		// Handle different response formats
		// The response can be:
		// 1. Direct: { result: "...", variablesReference: 12 }
		// 2. Nested: { body: { result: "...", variablesReference: 12 } }
		// 3. Result only: { result: { value: "...", variablesReference: 12 } }
		
		if (response && response.variablesReference !== undefined) {
			// Direct format with variablesReference
			return response;
		} else if (response && response.result) {
			// Check if result has variablesReference
			if (response.result.variablesReference !== undefined) {
				return response.result;
			}
			// Otherwise, result might be the full object
			return response.result;
		} else if (response && response.body) {
			// Nested format
			if (response.body.variablesReference !== undefined) {
				return response.body;
			} else if (response.body.result) {
				return response.body.result;
			}
			return response.body;
		} else {
			return response;
		}
	} catch (error: any) {
		throw new Error(`Failed to evaluate expression "${expression}": ${error.message || error}`);
	}
}

/**
 * Gets variables from a scope
 */
export async function getVariables(frameId?: number): Promise<any[]> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}

	try {
		const response = await debugSession.customRequest('variables', {
			variablesReference: 0,
			frameId: frameId
		});
		return response.variables || [];
	} catch (error) {
		throw new Error(`Failed to get variables: ${error}`);
	}
}

/**
 * Gets children of a variable (for objects/structures)
 */
export async function getVariableChildren(variablesReference: number): Promise<any[]> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}

	try {
		const response = await debugSession.customRequest('variables', {
			variablesReference: variablesReference
		});
		
		// Handle different response formats
		const variables = response?.variables || response?.body?.variables || [];

		// Java (java-debug) wraps an object's fields in a single unnamed child when its class has toString()
		if (variables.length === 1 && variables[0].name === '' && variables[0].variablesReference > 0) {
			return getVariableChildren(variables[0].variablesReference);
		}
		return variables;
	} catch (error: any) {
		throw new Error(`Failed to get variable children: ${error.message || error}`);
	}
}

/**
 * Recursively searches for a variable in nested objects
 */
async function searchVariableRecursive(
	variables: any[],
	targetName: string,
	currentPath: string,
	scopeName: string,
	locations: VariableLocation[],
	maxDepth: number = 3,
	depth: number = 0,
	seenLocations?: Set<string>
): Promise<void> {
	if (depth >= maxDepth) {
		return;
	}

	// Initialize seenLocations if not provided
	if (!seenLocations) {
		seenLocations = new Set<string>();
	}

	for (const variable of variables) {
		if (!variable.variablesReference || variable.variablesReference === 0) {
			continue;
		}

		const newPath = currentPath ? `${currentPath}.${variable.name}` : variable.name;

		// Check if this variable matches
		if (variable.name === targetName) {
			const locationKey = `${newPath}|${scopeName}`;
			// Only add if we haven't seen this exact path+scope combination
			if (!seenLocations.has(locationKey)) {
				seenLocations.add(locationKey);
				locations.push({
					path: newPath,
					scope: scopeName,
					variablesReference: variable.variablesReference
				});
			}
		}

		// Recursively search in nested objects
		try {
			const children = await getVariableChildren(variable.variablesReference);
			await searchVariableRecursive(children, targetName, newPath, scopeName, locations, maxDepth, depth + 1, seenLocations);
		} catch (error) {
			// Skip if we can't access children
		}
	}
}

/**
 * Searches for a variable by name across all scopes and returns all locations
 */
export async function searchVariableInAllScopes(variableName: string): Promise<VariableLocation[]> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}

	const locations: VariableLocation[] = [];
	const frameId = await getCurrentFrameId();

	try {
		// Get all scopes for the current frame
		const scopesResponse = await debugSession.customRequest('scopes', { frameId });
		const scopes = scopesResponse?.scopes || scopesResponse?.body?.scopes || [];

		// Search in each scope
		for (const scope of scopes) {
			try {
				const scopeVars = await getVariableChildren(scope.variablesReference);
				
				// Use a Set to track unique locations (path + scope combination)
				const seenLocations = new Set<string>();
				
				// Search for the variable in this scope (direct match)
				const foundVar = scopeVars.find((v: any) => v.name === variableName);
				if (foundVar && foundVar.variablesReference && foundVar.variablesReference > 0) {
					const locationKey = `${variableName}|${scope.name || 'Unknown'}`;
					if (!seenLocations.has(locationKey)) {
						seenLocations.add(locationKey);
						locations.push({
							path: variableName,
							scope: scope.name || 'Unknown',
							variablesReference: foundVar.variablesReference
						});
					}
				}

				// Also search recursively in nested objects (with path tracking)
				await searchVariableRecursive(scopeVars, variableName, '', scope.name || 'Unknown', locations, 3, 0, seenLocations);
			} catch (error) {
				console.warn(`Failed to search in scope ${scope.name}:`, error);
			}
		}
	} catch (error) {
		console.warn('Failed to get scopes, trying direct evaluation:', error);
		// Fallback: try direct evaluation
		try {
			const evalResult = await evaluateVariable(variableName, frameId);
			if (evalResult && evalResult.variablesReference && evalResult.variablesReference > 0) {
				locations.push({
					path: variableName,
					scope: 'Current Frame',
					variablesReference: evalResult.variablesReference
				});
			}
		} catch (evalError) {
			// Variable not found
		}
	}

	return locations;
}

/**
 * Gets a property value using a dot-notation path
 */
export async function getPropertyByPath(rootPath: string, propertyPath: string): Promise<any> {
	if (!propertyPath || propertyPath.trim() === '') {
		// Empty path means use the root directly
		return await evaluateVariable(rootPath);
	}

	// Combine root path with property path
	const fullPath = `${rootPath}.${propertyPath}`;
	return await evaluateVariable(fullPath);
}

