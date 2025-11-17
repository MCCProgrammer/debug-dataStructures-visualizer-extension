import * as vscode from 'vscode';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface TreeNode {
	id: string;
	value: string | number; // Display value (key if available, otherwise value or fallback)
	key?: string | number; // Node key (shown in visualization)
	val?: string | number; // Node value (shown in details)
	attributes: Record<string, any>;
	left?: TreeNode;
	right?: TreeNode;
	children?: TreeNode[];
	x?: number;
	y?: number;
}

interface TreeData {
	root: TreeNode | null;
	error?: string;
}

interface VisualizationConfig {
	variablePath: string; // The full path to the root variable (e.g., "root", "tree.root", "obj.data.root")
	visualizationType: 'binaryTree' | 'stack' | 'queue' | 'linkedList';
	// Binary tree specific paths
	treePath?: string; // Path to the actual tree node (relative to variablePath, empty means use variablePath directly)
	sizePath?: string; // Path to size attribute (e.g., "size" or "root.size")
	leftPath?: string; // Path to left child (e.g., "left" or "root.left")
	rightPath?: string; // Path to right child (e.g., "right" or "root.right")
	keyPath?: string; // Path to node key (e.g., "key" or "root.key")
	valuePath?: string; // Path to node value (e.g., "val" or "root.val")
}

interface VariableLocation {
	path: string; // Full path to the variable (e.g., "root", "tree.root", "obj.data.root")
	scope: string; // Scope name (e.g., "Local", "Global", "Module")
	variablesReference: number;
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
	console.log('Data Structures Visualizer extension is now active!');

	// Map to track active visualization panels
	const activePanels = new Map<string, vscode.WebviewPanel>();
	
	// Map to track language presets for each debug session
	const sessionLanguagePresets = new Map<string, any>();
	
	// Map to track visualization configurations for each panel
	const panelConfigs = new Map<string, VisualizationConfig>();

	// ========================================================================
	// DEBUG ADAPTER PROTOCOL INTEGRATION
	// ========================================================================

	/**
	 * Gets the current frame ID from the active debug session
	 */
	async function getCurrentFrameId(): Promise<number | undefined> {
		const debugSession = vscode.debug.activeDebugSession;
		if (!debugSession) {
			return undefined;
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

			// Use the first thread (usually the main thread)
			const threadId = threads && threads.length > 0 ? threads[0].id : 1;

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
	async function evaluateVariable(expression: string, frameId?: number): Promise<any> {
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
	async function getVariables(frameId?: number): Promise<any[]> {
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
	async function getVariableChildren(variablesReference: number): Promise<any[]> {
		const debugSession = vscode.debug.activeDebugSession;
		if (!debugSession) {
			throw new Error('No active debug session');
		}

		try {
			const response = await debugSession.customRequest('variables', {
				variablesReference: variablesReference
			});
			
			// Handle different response formats
			if (response && response.variables) {
				return response.variables;
			} else if (response && response.body && response.body.variables) {
				return response.body.variables;
			} else {
				return [];
			}
		} catch (error: any) {
			throw new Error(`Failed to get variable children: ${error.message || error}`);
		}
	}

	/**
	 * Searches for a variable by name across all scopes and returns all locations
	 */
	async function searchVariableInAllScopes(variableName: string): Promise<VariableLocation[]> {
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
	 * Gets a property value using a dot-notation path
	 */
	async function getPropertyByPath(rootPath: string, propertyPath: string): Promise<any> {
		if (!propertyPath || propertyPath.trim() === '') {
			// Empty path means use the root directly
			return await evaluateVariable(rootPath);
		}

		// Combine root path with property path
		const fullPath = `${rootPath}.${propertyPath}`;
		return await evaluateVariable(fullPath);
	}

	/**
	 * Detects the programming language from the debug session
	 */
	function detectLanguage(debugSession: vscode.DebugSession): string {
		// Check session type/name
		const sessionType = debugSession.type.toLowerCase();
		const sessionName = debugSession.name.toLowerCase();
		
		if (sessionType.includes('python') || sessionName.includes('python') || sessionType === 'debugpy') {
			return 'python';
		} else if (sessionType.includes('java') || sessionName.includes('java')) {
			return 'java';
		} else if (sessionType.includes('javascript') || sessionType.includes('node')) {
			return 'javascript';
		} else if (sessionType.includes('cpp') || sessionType.includes('c++')) {
			return 'cpp';
		} else if (sessionType.includes('csharp') || sessionType.includes('c#')) {
			return 'csharp';
		}
		
		// Default fallback
		return 'unknown';
	}

	/**
	 * Applies language-specific presets
	 */
	function applyLanguagePresets(language: string): void {
		const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
		const autoDetect = config.get<boolean>('autoDetectLanguage', true);
		
		if (!autoDetect) {
			return;
		}
		
		const presets = config.get<any>('languagePresets', {});
		const languagePreset = presets[language];
		
		if (languagePreset) {
			console.log(`[applyLanguagePresets] Applying presets for language: ${language}`, languagePreset);
			
			// Apply presets (only if not already customized by user)
			if (languagePreset.leftChildName) {
				config.update('leftChildName', languagePreset.leftChildName, vscode.ConfigurationTarget.Workspace);
			}
			if (languagePreset.rightChildName) {
				config.update('rightChildName', languagePreset.rightChildName, vscode.ConfigurationTarget.Workspace);
			}
			if (languagePreset.nodeValueAttribute) {
				config.update('nodeValueAttribute', languagePreset.nodeValueAttribute, vscode.ConfigurationTarget.Workspace);
			}
		}
	}

	/**
	 * Builds a tree node from a variablesReference (DAP way)
	 * This is the correct way: use variablesReference directly, not evaluate expressions
	 */
	async function buildTreeNodeFromReference(
		variablesReference: number,
		visited: Set<number> = new Set(),
		depth: number = 0
	): Promise<TreeNode | null> {
		const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
		const maxDepth = config.get<number>('maxDepth', 20);
		const leftChildName = config.get<string>('leftChildName', 'left');
		const rightChildName = config.get<string>('rightChildName', 'right');
		const nodeValueAttribute = config.get<string>('nodeValueAttribute', 'value');

		if (depth > maxDepth) {
			return null;
		}

		// Prevent infinite loops
		if (visited.has(variablesReference)) {
			return null;
		}
		visited.add(variablesReference);

		try {
			// Step 2: Get variables using variablesReference
			const children = await getVariableChildren(variablesReference);
			
			if (!children || children.length === 0) {
				return null;
			}

			// Build attributes map
			const attributes: Record<string, any> = {};
			for (const child of children) {
				attributes[child.name] = child.value;
			}

			// Extract node value - try multiple common attribute names
			let nodeValue: string | number = 'null';
			const valueCandidates = [nodeValueAttribute, 'val', 'key', 'data', 'value', 'item', 'element'];
			for (const attr of valueCandidates) {
				if (attributes[attr] !== undefined && attributes[attr] !== null && attributes[attr] !== 'None') {
					nodeValue = attributes[attr];
					break;
				}
			}
			// If still no value found, try to use the first non-left/right attribute
			if (nodeValue === 'null') {
				for (const child of children) {
					if (child.name !== leftChildName && child.name !== rightChildName && child.value !== 'None') {
						nodeValue = child.value;
						break;
					}
				}
			}

			// Find left and right children using their variablesReference
			let leftChild: TreeNode | null = null;
			let rightChild: TreeNode | null = null;

			for (const child of children) {
				if (child.name === leftChildName) {
					// Check if it's null/None
					if (child.value === 'None' || child.value === 'null' || child.value === null || 
						child.variablesReference === undefined || child.variablesReference === 0) {
						leftChild = null;
					} else if (child.variablesReference && child.variablesReference > 0) {
						// Step 3: Recursively get children using variablesReference
						leftChild = await buildTreeNodeFromReference(child.variablesReference, new Set(visited), depth + 1);
					}
				} else if (child.name === rightChildName) {
					// Check if it's null/None
					if (child.value === 'None' || child.value === 'null' || child.value === null ||
						child.variablesReference === undefined || child.variablesReference === 0) {
						rightChild = null;
					} else if (child.variablesReference && child.variablesReference > 0) {
						// Step 3: Recursively get children using variablesReference
						rightChild = await buildTreeNodeFromReference(child.variablesReference, new Set(visited), depth + 1);
					}
				}
			}

			// Build node
			const node: TreeNode = {
				id: `node_${variablesReference}_${depth}`,
				value: String(nodeValue),
				attributes: attributes
			};

			if (leftChild || rightChild) {
				node.left = leftChild || undefined;
				node.right = rightChild || undefined;
			}

			return node;
		} catch (error: any) {
			console.error(`Error building tree from reference ${variablesReference}:`, error);
			return {
				id: `error_${variablesReference}_${depth}`,
				value: `Error: ${error.message || 'Unknown error'}`,
				attributes: { error: error.message || 'Unknown error' }
			};
		}
	}

	/**
	 * Gets tree data from debugger using correct DAP flow:
	 * 1. evaluate("root") → get variablesReference
	 * 2. variables(variablesReference) → get left/right
	 * 3. Recursively call variables() for each child
	 */
	async function getTreeData(variableName: string): Promise<TreeData> {
		try {
			// Step 1: Evaluate the variable name to get variablesReference
			const frameId = await getCurrentFrameId();
			let evaluateResult: any;
			let variablesReference: number | undefined;
			
			try {
				evaluateResult = await evaluateVariable(variableName, frameId);
				console.log(`[getTreeData] Evaluate result for "${variableName}":`, JSON.stringify(evaluateResult, null, 2));
				
				if (evaluateResult) {
					// Check if we got a variablesReference
					// It might be in different places depending on the debugger
					if (evaluateResult.variablesReference !== undefined) {
						variablesReference = evaluateResult.variablesReference;
					} else if (evaluateResult.result && evaluateResult.result.variablesReference !== undefined) {
						variablesReference = evaluateResult.result.variablesReference;
					} else if (typeof evaluateResult === 'object' && 'variablesReference' in evaluateResult) {
						variablesReference = (evaluateResult as any).variablesReference;
					}
				}
			} catch (evalError) {
				console.warn(`[getTreeData] Evaluate failed, trying alternative method:`, evalError);
			}
			
			// Alternative: If evaluate didn't work, try getting from scope variables
			if (variablesReference === undefined || variablesReference === 0) {
				console.log(`[getTreeData] Trying to get variable from scope...`);
				try {
					const scopeVariables = await getVariables(frameId);
					console.log(`[getTreeData] Scope variables:`, scopeVariables);
					
					// Find the variable in the scope
					const foundVar = scopeVariables.find((v: any) => v.name === variableName);
					if (foundVar && foundVar.variablesReference && foundVar.variablesReference > 0) {
						variablesReference = foundVar.variablesReference;
						console.log(`[getTreeData] Found variable in scope with variablesReference:`, variablesReference);
					} else {
						// Try getting variables from the first scope
						const debugSession = vscode.debug.activeDebugSession;
						if (debugSession && frameId !== undefined) {
							try {
								// Get scopes for the current frame
								const scopesResponse = await debugSession.customRequest('scopes', { frameId });
								const scopes = scopesResponse?.scopes || scopesResponse?.body?.scopes || [];
								
								if (scopes.length > 0) {
									const firstScope = scopes[0];
									const scopeVars = await getVariableChildren(firstScope.variablesReference);
									const foundVar = scopeVars.find((v: any) => v.name === variableName);
									if (foundVar && foundVar.variablesReference && foundVar.variablesReference > 0) {
										variablesReference = foundVar.variablesReference;
										console.log(`[getTreeData] Found variable in first scope with variablesReference:`, variablesReference);
									}
								}
							} catch (scopeError) {
								console.warn(`[getTreeData] Failed to get scopes:`, scopeError);
							}
						}
					}
				} catch (scopeError) {
					console.warn(`[getTreeData] Failed to get variables from scope:`, scopeError);
				}
			}
			
			console.log(`[getTreeData] Final variablesReference:`, variablesReference);
			
			if (variablesReference === undefined || variablesReference === 0) {
				// Log the full result to help debug
				console.log(`[getTreeData] Full evaluate result:`, evaluateResult);
				return {
					root: null,
					error: `Variable "${variableName}" not found or has no variablesReference. Please ensure the variable exists in the current scope and is an object (not a primitive).`
				};
			}

			// Step 2 & 3: Build tree recursively using variablesReference
			const root = await buildTreeNodeFromReference(variablesReference, new Set(), 0);
			
			return { root };
		} catch (error: any) {
			console.error(`Error getting tree data for "${variableName}":`, error);
			return {
				root: null,
				error: error.message || 'Failed to build tree structure'
			};
		}
	}

	/**
	 * Gets tree data using a configuration with paths
	 */
	async function getTreeDataWithConfig(config: VisualizationConfig): Promise<TreeData> {
		try {
			if (config.visualizationType !== 'binaryTree') {
				return {
					root: null,
					error: `Visualization type "${config.visualizationType}" is not yet implemented. Only binaryTree is supported.`
				};
			}

			// Get the root variable
			const frameId = await getCurrentFrameId();
			const rootEval = await evaluateVariable(config.variablePath, frameId);
			
			let rootVariablesReference: number | undefined;
			if (rootEval && rootEval.variablesReference !== undefined) {
				rootVariablesReference = rootEval.variablesReference;
			} else if (rootEval && rootEval.result && rootEval.result.variablesReference !== undefined) {
				rootVariablesReference = rootEval.result.variablesReference;
			}

			if (!rootVariablesReference || rootVariablesReference === 0) {
				return {
					root: null,
					error: `Variable "${config.variablePath}" not found or has no variablesReference.`
				};
			}

			// Determine the actual tree root path
			// treePath is already the full path (variable + user input) from the wizard
			let treeRootPath = config.variablePath;
			if (config.treePath && config.treePath.trim() !== '') {
				// Check if treePath already includes the variable path
				if (config.treePath.startsWith(config.variablePath + '.') || config.treePath === config.variablePath) {
					// treePath is already a full path (e.g., "bst.root")
					treeRootPath = config.treePath;
				} else {
					// If not, it's just the suffix, so combine them
					treeRootPath = `${config.variablePath}.${config.treePath}`;
				}
			}
			
			console.log(`[getTreeDataWithConfig] variablePath: ${config.variablePath}, treePath: ${config.treePath}, treeRootPath: ${treeRootPath}`);

			// Build tree using path-based navigation
			const root = await buildTreeNodeWithPaths(
				treeRootPath,
				config,
				new Set(),
				0
			);

			return { root };
		} catch (error: any) {
			console.error(`Error getting tree data with config:`, error);
			return {
				root: null,
				error: error.message || 'Failed to build tree structure'
			};
		}
	}

	/**
	 * Builds a tree node using path-based navigation
	 */
	async function buildTreeNodeWithPaths(
		nodePath: string,
		config: VisualizationConfig,
		visited: Set<string> = new Set(),
		depth: number = 0
	): Promise<TreeNode | null> {
		const maxDepth = vscode.workspace.getConfiguration('dataStructuresVisualizer').get<number>('maxDepth', 20);
		
		if (depth > maxDepth || visited.has(nodePath)) {
			return null;
		}
		visited.add(nodePath);

		try {
			// Get the node's variablesReference
			const frameId = await getCurrentFrameId();
			console.log(`[buildTreeNodeWithPaths] Evaluating nodePath: ${nodePath}`);
			const nodeEval = await evaluateVariable(nodePath, frameId);
			
			let nodeVariablesReference: number | undefined;
			if (nodeEval && nodeEval.variablesReference !== undefined) {
				nodeVariablesReference = nodeEval.variablesReference;
			} else if (nodeEval && nodeEval.result && nodeEval.result.variablesReference !== undefined) {
				nodeVariablesReference = nodeEval.result.variablesReference;
			}

			if (!nodeVariablesReference || nodeVariablesReference === 0) {
				return null; // Node is null/None
			}

			// Get node's children
			const children = await getVariableChildren(nodeVariablesReference);
			
			// Build attributes map
			const attributes: Record<string, any> = {};
			for (const child of children) {
				attributes[child.name] = child.value;
			}

			// Helper function to build full path using tree path as base
			const buildFullPath = (fieldPath: string): string => {
				if (!fieldPath || fieldPath.trim() === '') {
					return nodePath;
				}
				
				// For child nodes, nodePath already includes the full path from parent
				// For root node, nodePath is the tree root path
				let basePath = nodePath;
				
				// fieldPath is just the suffix (e.g., "left", "key", "val")
				// nodePath already contains the full path (e.g., "bst.root" or "bst.root.left")
				// So we just append the fieldPath to nodePath
				return `${basePath}.${fieldPath}`;
			};

			// Extract node key using keyPath
			let nodeKey: string | number | undefined = undefined;
			if (config.keyPath && config.keyPath.trim() !== '') {
				try {
					const keyFullPath = buildFullPath(config.keyPath);
					const keyEval = await evaluateVariable(keyFullPath, frameId);
					if (keyEval && keyEval.result) {
						nodeKey = String(keyEval.result);
					} else if (keyEval && typeof keyEval === 'string') {
						nodeKey = keyEval;
					} else if (keyEval && typeof keyEval === 'number') {
						nodeKey = keyEval;
					}
				} catch (error) {
					// Try to find key in attributes
					const keyPathParts = config.keyPath.split('.');
					const keyAttrName = keyPathParts[keyPathParts.length - 1];
					if (attributes[keyAttrName] !== undefined) {
						nodeKey = String(attributes[keyAttrName]);
					}
				}
			}

			// Extract node value using valuePath
			let nodeValue: string | number | undefined = undefined;
			if (config.valuePath && config.valuePath.trim() !== '') {
				try {
					const valueFullPath = buildFullPath(config.valuePath);
					const valueEval = await evaluateVariable(valueFullPath, frameId);
					if (valueEval && valueEval.result) {
						nodeValue = String(valueEval.result);
					} else if (valueEval && typeof valueEval === 'string') {
						nodeValue = valueEval;
					} else if (valueEval && typeof valueEval === 'number') {
						nodeValue = valueEval;
					}
				} catch (error) {
					// Try to find value in attributes
					const valuePathParts = config.valuePath.split('.');
					const valueAttrName = valuePathParts[valuePathParts.length - 1];
					if (attributes[valueAttrName] !== undefined) {
						nodeValue = String(attributes[valueAttrName]);
					}
				}
			}

			// Determine display value: prefer key, then value, then fallback
			let displayValue: string | number = 'null';
			if (nodeKey !== undefined) {
				displayValue = String(nodeKey);
			} else if (nodeValue !== undefined) {
				displayValue = String(nodeValue);
			} else {
				// Fallback: try common attribute names
				const valueCandidates = ['val', 'value', 'key', 'data', 'item'];
				for (const attr of valueCandidates) {
					if (attributes[attr] !== undefined && attributes[attr] !== null && attributes[attr] !== 'None') {
						displayValue = String(attributes[attr]);
						break;
					}
				}
			}

			// Get left and right children using paths
			let leftChild: TreeNode | null = null;
			let rightChild: TreeNode | null = null;

			if (config.leftPath && config.leftPath.trim() !== '') {
				const leftFullPath = buildFullPath(config.leftPath);
				leftChild = await buildTreeNodeWithPaths(leftFullPath, config, new Set(visited), depth + 1);
			} else {
				// Try to find left child in attributes
				const leftAttr = children.find((c: any) => c.name === 'left' || c.name === 'leftChild');
				if (leftAttr && leftAttr.variablesReference && leftAttr.variablesReference > 0) {
					const leftPath = `${nodePath}.left`;
					leftChild = await buildTreeNodeWithPaths(leftPath, config, new Set(visited), depth + 1);
				}
			}

			if (config.rightPath && config.rightPath.trim() !== '') {
				const rightFullPath = buildFullPath(config.rightPath);
				rightChild = await buildTreeNodeWithPaths(rightFullPath, config, new Set(visited), depth + 1);
			} else {
				// Try to find right child in attributes
				const rightAttr = children.find((c: any) => c.name === 'right' || c.name === 'rightChild');
				if (rightAttr && rightAttr.variablesReference && rightAttr.variablesReference > 0) {
					const rightPath = `${nodePath}.right`;
					rightChild = await buildTreeNodeWithPaths(rightPath, config, new Set(visited), depth + 1);
				}
			}

			// Build node
			const node: TreeNode = {
				id: `node_${nodePath}_${depth}`,
				value: displayValue,
				attributes: attributes
			};
			
			// Add key and value separately if they exist
			if (nodeKey !== undefined) {
				node.key = nodeKey;
			}
			if (nodeValue !== undefined) {
				node.val = nodeValue;
			}

			if (leftChild || rightChild) {
				node.left = leftChild || undefined;
				node.right = rightChild || undefined;
			}

			return node;
		} catch (error: any) {
			console.error(`Error building tree node from path "${nodePath}":`, error);
			return {
				id: `error_${nodePath}_${depth}`,
				value: `Error: ${error.message || 'Unknown error'}`,
				attributes: { error: error.message || 'Unknown error' }
			};
		}
	}

	// ========================================================================
	// WEBVIEW CREATION AND MANAGEMENT
	// ========================================================================

	/**
	 * Creates or reveals the visualization panel
	 */
	async function createOrRevealPanel(variableName: string): Promise<vscode.WebviewPanel> {
		const panelId = `visualizer_${variableName}`;
		let panel = activePanels.get(panelId);

		if (panel) {
			panel.reveal();
			return panel;
		}

		// Create new panel
		panel = vscode.window.createWebviewPanel(
			'dataStructuresVisualizer',
			`Data Structure Visualizer: ${variableName}`,
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		activePanels.set(panelId, panel);

		// Handle panel disposal
		panel.onDidDispose(() => {
			activePanels.delete(panelId);
			panelConfigs.delete(panelId);
		});

		// Store current variable name for this panel
		let currentVariableName = variableName;
		let currentConfig: VisualizationConfig | null = null;

		// Handle messages from webview
		panel.webview.onDidReceiveMessage(async (message) => {
			const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
			const delay = config.get<number>('autoRefreshInterval', 300);
			
			switch (message.command) {
				case 'searchVariable':
					// Wizard step 1: Search for variable
					try {
						const locations = await searchVariableInAllScopes(message.variableName);
						panel.webview.postMessage({
							command: 'variableSearchResults',
							locations: locations
						});
					} catch (error: any) {
						panel.webview.postMessage({
							command: 'variableSearchError',
							error: error.message || 'Failed to search for variable'
						});
					}
					break;
				case 'startVisualization':
					// Wizard step: Start visualization with config
					currentConfig = message.config as VisualizationConfig;
					currentVariableName = currentConfig.variablePath;
					panelConfigs.set(panelId, currentConfig);
					panel.title = `Data Structure Visualizer: ${currentConfig.variablePath}`;
					updateWebviewContent(panel, currentConfig.variablePath, false, currentConfig);
					await refreshVisualizationWithConfig(panel, currentConfig);
					break;
				case 'refresh':
					if (currentConfig) {
						await refreshVisualizationWithConfig(panel!, currentConfig);
					} else {
						await refreshVisualization(panel!, currentVariableName);
					}
					break;
				case 'openWizard':
					// Open wizard to change variable/configuration
					updateWebviewContent(panel, null, true);
					break;
				case 'addNewVisualization':
					// Open a new panel with wizard (doesn't close current one)
					try {
						const newPanel = await createOrRevealPanel('wizard_' + Date.now());
						updateWebviewContent(newPanel, null, true);
					} catch (error: any) {
						vscode.window.showErrorMessage(`Failed to open new visualization: ${error.message}`);
					}
					break;
				case 'checkPath':
					// Check if a path exists and return example value
					// fieldPath already contains the full path (prefix + user input)
					try {
						const fieldPath = message.fieldPath;
						
						// fieldPath is already the full path from the wizard
						const fullPath = fieldPath;
						
						const frameId = await getCurrentFrameId();
						const evalResult = await evaluateVariable(fullPath, frameId);
						
						let value: any = null;
						if (evalResult && evalResult.result) {
							value = evalResult.result;
						} else if (evalResult && evalResult.value) {
							value = evalResult.value;
						} else if (evalResult && typeof evalResult !== 'object') {
							value = evalResult;
						} else if (evalResult && evalResult.variablesReference && evalResult.variablesReference > 0) {
							value = '[Object]';
						}
						
						panel.webview.postMessage({
							command: 'pathCheckResult',
							fieldId: message.fieldId,
							success: true,
							value: value !== null ? value : 'null',
							path: fullPath
						});
					} catch (error: any) {
						panel.webview.postMessage({
							command: 'pathCheckResult',
							fieldId: message.fieldId,
							success: false,
							error: error.message || 'Path not found'
						});
					}
					break;
				case 'getSizeValue':
					// Get size value using the configured path
					try {
						const sizePath = message.sizePath;
						const variablePath = message.variablePath;
						// Build full path: if sizePath doesn't start with variablePath, combine them
						const fullPath = sizePath.startsWith(variablePath) ? sizePath : `${variablePath}.${sizePath}`;
						const frameId = await getCurrentFrameId();
						const sizeEval = await evaluateVariable(fullPath, frameId);
						
						let sizeValue = 'N/A';
						if (sizeEval && sizeEval.result) {
							sizeValue = String(sizeEval.result);
						} else if (sizeEval && typeof sizeEval === 'string') {
							sizeValue = sizeEval;
						} else if (sizeEval && sizeEval.value) {
							sizeValue = String(sizeEval.value);
						} else if (sizeEval && typeof sizeEval === 'number') {
							sizeValue = String(sizeEval);
						}
						
						panel.webview.postMessage({
							command: 'updateSizeValue',
							size: sizeValue
						});
					} catch (error: any) {
						panel.webview.postMessage({
							command: 'updateSizeValue',
							size: 'Error'
						});
					}
					break;
				case 'changeVariable':
					const newVariableName = message.variableName;
					if (newVariableName && newVariableName !== currentVariableName) {
						currentVariableName = newVariableName;
						// Update panel title
						panel.title = `Data Structure Visualizer: ${newVariableName}`;
						// Update webview HTML with new variable name
						updateWebviewContent(panel, newVariableName);
						// Refresh visualization with new variable
						await refreshVisualization(panel, newVariableName);
					}
					break;
				case 'debugStepOver':
					await vscode.commands.executeCommand('workbench.action.debug.stepOver');
					// Auto-refresh after step over
					setTimeout(async () => {
						if (currentConfig) {
							await refreshVisualizationWithConfig(panel!, currentConfig);
						} else {
							await refreshVisualization(panel!, currentVariableName);
						}
					}, delay);
					break;
				case 'debugStepInto':
					await vscode.commands.executeCommand('workbench.action.debug.stepInto');
					// Auto-refresh after step into
					setTimeout(async () => {
						if (currentConfig) {
							await refreshVisualizationWithConfig(panel!, currentConfig);
						} else {
							await refreshVisualization(panel!, currentVariableName);
						}
					}, delay);
					break;
				case 'debugStepOut':
					await vscode.commands.executeCommand('workbench.action.debug.stepOut');
					// Auto-refresh after step out
					setTimeout(async () => {
						if (currentConfig) {
							await refreshVisualizationWithConfig(panel!, currentConfig);
						} else {
							await refreshVisualization(panel!, currentVariableName);
						}
					}, delay);
					break;
				case 'debugContinue':
					await vscode.commands.executeCommand('workbench.action.debug.continue');
					// Auto-refresh after continue (when it stops again)
					setTimeout(async () => {
						if (currentConfig) {
							await refreshVisualizationWithConfig(panel!, currentConfig);
						} else {
							await refreshVisualization(panel!, currentVariableName);
						}
					}, delay);
					break;
			}
		});

		return panel;
	}

	/**
	 * Refreshes the visualization with current tree data
	 */
	async function refreshVisualization(panel: vscode.WebviewPanel, variableName: string) {
		const treeData = await getTreeData(variableName);
		panel.webview.postMessage({
			command: 'updateTree',
			data: treeData
		});
		// Also update the variable name in the input field
		panel.webview.postMessage({
			command: 'updateVariableName',
			variableName: variableName
		});
	}

	/**
	 * Refreshes the visualization using a configuration with paths
	 */
	async function refreshVisualizationWithConfig(panel: vscode.WebviewPanel, config: VisualizationConfig) {
		try {
			const treeData = await getTreeDataWithConfig(config);
			panel.webview.postMessage({
				command: 'updateTree',
				data: treeData
			});
		} catch (error: any) {
			panel.webview.postMessage({
				command: 'updateTree',
				data: {
					root: null,
					error: error.message || 'Failed to build tree'
				}
			});
		}
	}

	/**
	 * Updates the webview HTML content
	 */
	function updateWebviewContent(panel: vscode.WebviewPanel, variableName: string | null, showWizard: boolean = false, visualizationConfig?: VisualizationConfig) {
		const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
		const showDebugControls = config.get<boolean>('showDebugControls', true);
		const treeOrientation = config.get<string>('treeOrientation', 'horizontal');

		panel.webview.html = getWebviewHtml(panel.webview, variableName, showDebugControls, treeOrientation, showWizard, visualizationConfig);
		
		// If we have a config, send it to the webview for size display
		if (visualizationConfig && !showWizard) {
			panel.webview.postMessage({
				command: 'updateConfig',
				config: visualizationConfig
			});
		}
	}

	// ========================================================================
	// COMMANDS
	// ========================================================================

	/**
	 * Command: Open Data Structure Visualizer
	 */
	const openVisualizerCommand = vscode.commands.registerCommand(
		'dataStructuresVisualizer.openVisualizer',
		async () => {
			const debugSession = vscode.debug.activeDebugSession;
			if (!debugSession) {
				vscode.window.showErrorMessage('No active debug session. Please start debugging first.');
				return;
			}

			try {
				// Open webview immediately with wizard
				const panel = await createOrRevealPanel('wizard');
				updateWebviewContent(panel, null, true); // true = show wizard
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to open visualizer: ${error.message}`);
			}
		}
	);

	/**
	 * Command: Refresh Visualization
	 */
	const refreshCommand = vscode.commands.registerCommand(
		'dataStructuresVisualizer.refreshVisualization',
		async () => {
			const activePanel = Array.from(activePanels.values()).find(p => p.visible);
			if (!activePanel) {
				vscode.window.showInformationMessage('No active visualization panel found.');
				return;
			}

			// Extract variable name from panel title
			const title = activePanel.title;
			const match = title.match(/Data Structure Visualizer: (.+)/);
			if (match && match[1]) {
				await refreshVisualization(activePanel, match[1]);
			}
		}
	);

	// ========================================================================
	// LANGUAGE DETECTION AND PRESETS
	// ========================================================================

	/**
	 * Detect language when debug session starts and apply presets
	 */
	const debugStartListener = vscode.debug.onDidStartDebugSession((session) => {
		const language = detectLanguage(session);
		console.log(`[Language Detection] Debug session started: type="${session.type}", language="${language}"`);
		
		// Store language for this session
		sessionLanguagePresets.set(session.id, language);
		
		// Apply language presets
		applyLanguagePresets(language);
		
		vscode.window.showInformationMessage(
			`Data Structures Visualizer: Detected ${language} debug session. Presets applied.`,
			{ modal: false }
		);
	});

	/**
	 * Clean up when debug session ends
	 */
	const debugEndListener = vscode.debug.onDidTerminateDebugSession((session) => {
		sessionLanguagePresets.delete(session.id);
		console.log(`[Language Detection] Debug session ended: ${session.id}`);
	});

	// ========================================================================
	// DEBUG STATE LISTENERS
	// ========================================================================

	/**
	 * Auto-refresh visualization when debug state changes (always enabled)
	 */
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const delay = config.get<number>('autoRefreshInterval', 300);
	
	// Listen for debug session custom events (breakpoint hits, step, etc.)
	const debugCustomEventListener = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
		// Refresh when debugger stops (breakpoint hit, step, etc.)
		if (e.event === 'stopped' || e.event === 'breakpoint' || e.event === 'step') {
			// Small delay to ensure debugger state is updated
			setTimeout(async () => {
				// Refresh all active panels
				for (const [panelId, panel] of activePanels.entries()) {
					if (panel.visible) {
						const config = panelConfigs.get(panelId);
						if (config) {
							await refreshVisualizationWithConfig(panel, config);
						} else {
							const match = panelId.match(/visualizer_(.+)/);
							if (match && match[1] && match[1] !== 'wizard') {
								await refreshVisualization(panel, match[1]);
							}
						}
					}
				}
			}, delay);
		}
	});

	// Listen for when debug session becomes active (might have stopped)
	const debugSessionListener = vscode.debug.onDidChangeActiveDebugSession(async (session) => {
		if (session) {
			// Small delay to ensure session state is updated
			setTimeout(async () => {
				// Refresh all active panels when debug session changes
				for (const [panelId, panel] of activePanels.entries()) {
					if (panel.visible) {
						const config = panelConfigs.get(panelId);
						if (config) {
							await refreshVisualizationWithConfig(panel, config);
						} else {
							const match = panelId.match(/visualizer_(.+)/);
							if (match && match[1] && match[1] !== 'wizard') {
								await refreshVisualization(panel, match[1]);
							}
						}
					}
				}
			}, delay);
		}
	});

	context.subscriptions.push(debugCustomEventListener, debugSessionListener);

	// ========================================================================
	// REGISTER COMMANDS
	// ========================================================================

	// Register all subscriptions
	context.subscriptions.push(
		openVisualizerCommand, 
		refreshCommand,
		debugStartListener,
		debugEndListener
	);
}

/**
 * Generates HTML content for the wizard
 */
function getWizardHtml(webview: vscode.Webview): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Data Structure Visualizer - Setup Wizard</title>
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		.wizard-container {
			max-width: 600px;
			margin: 0 auto;
		}
		.wizard-step {
			display: none;
			padding: 20px;
			background-color: var(--vscode-panel-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			margin-bottom: 20px;
		}
		.wizard-step.active {
			display: block;
		}
		.wizard-step h2 {
			margin-top: 0;
			margin-bottom: 20px;
		}
		.form-group {
			margin-bottom: 15px;
		}
		.form-group label {
			display: block;
			margin-bottom: 5px;
			font-weight: 500;
		}
		.form-group input, .form-group select {
			width: 100%;
			padding: 8px 12px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			font-size: 13px;
			font-family: monospace;
			box-sizing: border-box;
		}
		.form-group input:focus, .form-group select:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}
		.form-group select option {
			background-color: var(--vscode-dropdown-background);
			color: var(--vscode-dropdown-foreground);
			padding: 8px;
		}
		.form-group select option:hover,
		.form-group select option:checked {
			background-color: var(--vscode-list-activeSelectionBackground);
			color: var(--vscode-list-activeSelectionForeground);
		}
		.form-group select option:disabled {
			opacity: 0.6;
			color: var(--vscode-descriptionForeground);
		}
		.form-group .help-text {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
			margin-top: 5px;
		}
		.button-group {
			display: flex;
			gap: 10px;
			justify-content: flex-end;
			margin-top: 20px;
		}
		button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 14px;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		.variable-locations {
			margin-top: 10px;
		}
		.variable-location {
			padding: 10px;
			margin-bottom: 10px;
			background-color: var(--vscode-list-hoverBackground);
			border: 1px solid var(--vscode-list-activeSelectionBackground);
			border-radius: 4px;
			cursor: pointer;
		}
		.variable-location:hover {
			background-color: var(--vscode-list-activeSelectionBackground);
		}
		.variable-location.selected {
			background-color: var(--vscode-list-activeSelectionBackground);
			border-color: var(--vscode-focusBorder);
		}
		.variable-location .path {
			font-family: monospace;
			font-weight: bold;
		}
		.variable-location .scope {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		.error-message {
			color: var(--vscode-errorForeground);
			margin-top: 10px;
			padding: 10px;
			background-color: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			border-radius: 4px;
		}
		.loading {
			text-align: center;
			padding: 20px;
			color: var(--vscode-descriptionForeground);
		}
		.check-btn {
			padding: 6px 12px;
			font-size: 12px;
			white-space: nowrap;
		}
		.field-result {
			padding: 8px;
			border-radius: 4px;
			font-size: 12px;
			font-family: monospace;
		}
		.field-result.success {
			background-color: var(--vscode-inputValidation-infoBackground);
			border: 1px solid var(--vscode-inputValidation-infoBorder);
			color: var(--vscode-inputValidation-infoForeground);
		}
		.field-result.error {
			background-color: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			color: var(--vscode-inputValidation-errorForeground);
		}
		.path-input-group {
			display: flex;
			align-items: center;
			gap: 0;
		}
		.path-prefix {
			padding: 8px 12px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-descriptionForeground);
			border: 1px solid var(--vscode-input-border);
			border-right: none;
			border-radius: 4px 0 0 4px;
			font-size: 13px;
			font-family: monospace;
			user-select: none;
			pointer-events: none;
		}
		.path-input-group input {
			border-radius: 0 4px 4px 0;
			border-left: none;
		}
		.path-input-group input:focus {
			border-left: 1px solid var(--vscode-focusBorder);
		}
	</style>
</head>
<body>
	<div class="wizard-container">
		<h1>Data Structure Visualizer - Setup Wizard</h1>
		
		<!-- Step 1: Variable Name -->
		<div class="wizard-step active" id="step1">
			<h2>Step 1: Variable Name</h2>
			<div class="form-group">
				<label for="variable-name-input">Enter the variable name to visualize:</label>
				<input type="text" id="variable-name-input" placeholder="e.g., root, tree, myBST" autofocus>
				<div class="help-text">The extension will search for this variable in all scopes (local, global, etc.)</div>
			</div>
			<div id="variable-search-results" class="variable-locations" style="display: none;"></div>
			<div id="variable-search-error" class="error-message" style="display: none;"></div>
			<div id="variable-search-loading" class="loading" style="display: none;">Searching for variable...</div>
			<div class="button-group">
				<button id="search-variable-btn">Search</button>
			</div>
		</div>
		
		<!-- Step 2: Visualization Type -->
		<div class="wizard-step" id="step2">
			<h2>Step 2: Visualization Type</h2>
			<div class="form-group">
				<label for="visualization-type">Select the type of data structure:</label>
				<select id="visualization-type">
					<option value="binaryTree">Binary Tree</option>
					<option value="stack" disabled>Stack (Coming Soon)</option>
					<option value="queue" disabled>Queue (Coming Soon)</option>
					<option value="linkedList" disabled>Linked List (Coming Soon)</option>
				</select>
			</div>
			<div class="button-group">
				<button class="secondary" id="back-to-step1">Back</button>
				<button id="next-to-step3">Next</button>
			</div>
		</div>
		
		<!-- Step 3: Binary Tree Configuration -->
		<div class="wizard-step" id="step3">
			<h2>Step 3: Binary Tree Configuration</h2>
			<div class="form-group">
				<label for="tree-path">Tree Path (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="tree-path-prefix"></span>
						<input type="text" id="tree-path" placeholder="e.g., root (empty = use variable directly)">
					</div>
					<button type="button" class="check-btn" data-field="tree-path">Check</button>
				</div>
				<div class="help-text">Path to the actual tree node. Leave empty if the variable itself is the tree root. This will be used as base path for other fields.</div>
				<div id="tree-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="size-path">Size Path (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="size-path-prefix"></span>
						<input type="text" id="size-path" placeholder="e.g., size">
					</div>
					<button type="button" class="check-btn" data-field="size-path">Check</button>
				</div>
				<div class="help-text">Path to the size attribute (relative to tree path if provided). Leave empty if not tracked.</div>
				<div id="size-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="left-path">Left Child Path:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="left-path-prefix"></span>
						<input type="text" id="left-path" placeholder="e.g., left" value="left">
					</div>
					<button type="button" class="check-btn" data-field="left-path">Check</button>
				</div>
				<div class="help-text">Path to the left child (relative to tree path if provided). Default: "left"</div>
				<div id="left-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="right-path">Right Child Path:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="right-path-prefix"></span>
						<input type="text" id="right-path" placeholder="e.g., right" value="right">
					</div>
					<button type="button" class="check-btn" data-field="right-path">Check</button>
				</div>
				<div class="help-text">Path to the right child (relative to tree path if provided). Default: "right"</div>
				<div id="right-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="key-path">Key Path (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="key-path-prefix"></span>
						<input type="text" id="key-path" placeholder="e.g., key">
					</div>
					<button type="button" class="check-btn" data-field="key-path">Check</button>
				</div>
				<div class="help-text">Path to the node key (relative to tree path if provided). Shown in node visualization.</div>
				<div id="key-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="value-path">Value Path (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="value-path-prefix"></span>
						<input type="text" id="value-path" placeholder="e.g., val, value">
					</div>
					<button type="button" class="check-btn" data-field="value-path">Check</button>
				</div>
				<div class="help-text">Path to the node value (relative to tree path if provided). Shown in node details when clicked.</div>
				<div id="value-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="button-group">
				<button class="secondary" id="back-to-step2">Back</button>
				<button id="start-visualization-btn">Start Visualization</button>
			</div>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let currentStep = 1;
		let selectedVariablePath = '';
		let selectedVariableScope = '';

		// Step 1: Variable name search
		document.getElementById('search-variable-btn').addEventListener('click', () => {
			const variableName = document.getElementById('variable-name-input').value.trim();
			if (!variableName) {
				alert('Please enter a variable name');
				return;
			}

			// Show loading
			document.getElementById('variable-search-loading').style.display = 'block';
			document.getElementById('variable-search-results').style.display = 'none';
			document.getElementById('variable-search-error').style.display = 'none';

			// Send search request
			vscode.postMessage({ command: 'searchVariable', variableName: variableName });
		});

		// Handle Enter key in variable name input
		document.getElementById('variable-name-input').addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				document.getElementById('search-variable-btn').click();
			}
		});

		// Function to update path prefixes
		function updatePathPrefixes() {
			const variablePrefix = selectedVariablePath ? selectedVariablePath + '.' : '';
			const treePathInput = document.getElementById('tree-path');
			const treePathValue = treePathInput ? treePathInput.value.trim() : '';
			
			// Tree path prefix: variable path
			const treePathPrefixEl = document.getElementById('tree-path-prefix');
			if (treePathPrefixEl) {
				treePathPrefixEl.textContent = variablePrefix;
			}
			
			// Size path prefix: always just variable path (not tree path)
			const sizePathPrefixEl = document.getElementById('size-path-prefix');
			if (sizePathPrefixEl) {
				sizePathPrefixEl.textContent = variablePrefix;
			}
			
			// Calculate base path for other fields (left, right, key, value)
			// If tree path is filled, use variable + tree path as base
			// Otherwise, use just variable path
			let basePath = variablePrefix;
			if (treePathValue) {
				// Combine variable path + tree path value
				basePath = variablePrefix + treePathValue + '.';
			}
			
			// Left/Right path prefix: base path
			const leftPathPrefixEl = document.getElementById('left-path-prefix');
			const rightPathPrefixEl = document.getElementById('right-path-prefix');
			if (leftPathPrefixEl) leftPathPrefixEl.textContent = basePath;
			if (rightPathPrefixEl) rightPathPrefixEl.textContent = basePath;
			
			// Key/Value path prefix: base path
			const keyPathPrefixEl = document.getElementById('key-path-prefix');
			const valuePathPrefixEl = document.getElementById('value-path-prefix');
			if (keyPathPrefixEl) keyPathPrefixEl.textContent = basePath;
			if (valuePathPrefixEl) valuePathPrefixEl.textContent = basePath;
		}

		// Step 2: Navigation
		document.getElementById('next-to-step3').addEventListener('click', () => {
			if (selectedVariablePath) {
				showStep(3);
				updatePathPrefixes();
			} else {
				alert('Please select a variable path first');
			}
		});

		document.getElementById('back-to-step1').addEventListener('click', () => {
			showStep(1);
		});

		// Step 3: Navigation
		document.getElementById('back-to-step2').addEventListener('click', () => {
			showStep(2);
		});

		// Update prefixes when tree path changes
		const treePathInput = document.getElementById('tree-path');
		if (treePathInput) {
			treePathInput.addEventListener('input', () => {
				updatePathPrefixes();
			});
		}

		// Helper function to get full path from prefix + input
		function getFullPath(fieldId) {
			const prefixEl = document.getElementById(fieldId + '-prefix');
			const inputEl = document.getElementById(fieldId);
			if (!prefixEl || !inputEl) return '';
			
			const prefix = prefixEl.textContent || '';
			const input = inputEl.value.trim();
			
			if (!input) return '';
			return prefix + input;
		}

		// Check button handlers for path validation
		document.querySelectorAll('.check-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const fieldId = btn.getAttribute('data-field');
				const fieldInput = document.getElementById(fieldId);
				const fieldValue = fieldInput.value.trim();
				const resultDiv = document.getElementById(fieldId + '-result');
				
				if (!fieldValue) {
					resultDiv.style.display = 'block';
					resultDiv.className = 'field-result error';
					resultDiv.textContent = 'Field is empty';
					return;
				}

				// Get full path (prefix + input)
				const fullPath = getFullPath(fieldId);
				
				resultDiv.style.display = 'block';
				resultDiv.className = 'field-result';
				resultDiv.textContent = 'Checking...';
				
				vscode.postMessage({ 
					command: 'checkPath', 
					variablePath: selectedVariablePath,
					treePath: document.getElementById('tree-path').value.trim(),
					fieldPath: fullPath,
					fieldId: fieldId
				});
			});
		});

		document.getElementById('start-visualization-btn').addEventListener('click', () => {
			const visualizationType = document.getElementById('visualization-type').value;
			
			// Get user input (suffix) for each field
			const treePathInput = document.getElementById('tree-path').value.trim();
			const sizePathInput = document.getElementById('size-path').value.trim();
			const leftPathInput = document.getElementById('left-path').value.trim() || 'left';
			const rightPathInput = document.getElementById('right-path').value.trim() || 'right';
			const keyPathInput = document.getElementById('key-path').value.trim();
			const valuePathInput = document.getElementById('value-path').value.trim();
			
			// For tree path: store full path if filled (variable + user input), otherwise empty
			const treePath = treePathInput ? getFullPath('tree-path') : '';
			
			// For other paths: store just the suffix (user input) since prefix is derived from tree path
			const config = {
				variablePath: selectedVariablePath,
				visualizationType: visualizationType,
				treePath: treePath,
				sizePath: sizePathInput,
				leftPath: leftPathInput,
				rightPath: rightPathInput,
				keyPath: keyPathInput,
				valuePath: valuePathInput
			};

			vscode.postMessage({ command: 'startVisualization', config: config });
		});

		function showStep(step) {
			document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
			document.getElementById('step' + step).classList.add('active');
			currentStep = step;
		}

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'variableSearchResults':
					document.getElementById('variable-search-loading').style.display = 'none';
					const locations = message.locations || [];
					
					if (locations.length === 0) {
						document.getElementById('variable-search-error').style.display = 'block';
						document.getElementById('variable-search-error').textContent = 'No variables found with that name.';
						return;
					}

					if (locations.length === 1) {
						// Only one location, auto-select and go to next step
						selectedVariablePath = locations[0].path;
						selectedVariableScope = locations[0].scope;
						showStep(2);
						// Update prefixes when step 3 is shown
						setTimeout(() => updatePathPrefixes(), 100);
						return;
					}

					// Multiple locations, show selection
					const resultsDiv = document.getElementById('variable-search-results');
					resultsDiv.innerHTML = '<strong>Multiple variables found. Please select one:</strong>';
					
					locations.forEach((location, index) => {
						const locationDiv = document.createElement('div');
						locationDiv.className = 'variable-location';
						locationDiv.innerHTML = \`
							<div class="path">\${escapeHtml(location.path)}</div>
							<div class="scope">Scope: \${escapeHtml(location.scope)}</div>
						\`;
						locationDiv.addEventListener('click', () => {
							document.querySelectorAll('.variable-location').forEach(l => l.classList.remove('selected'));
							locationDiv.classList.add('selected');
							selectedVariablePath = location.path;
							selectedVariableScope = location.scope;
							// Auto-advance to next step after selection
							setTimeout(() => {
								showStep(2);
								// Update prefixes when step 3 is shown
								setTimeout(() => updatePathPrefixes(), 100);
							}, 300);
						});
						resultsDiv.appendChild(locationDiv);
					});
					
					resultsDiv.style.display = 'block';
					break;
				case 'variableSearchError':
					document.getElementById('variable-search-loading').style.display = 'none';
					document.getElementById('variable-search-error').style.display = 'block';
					document.getElementById('variable-search-error').textContent = message.error || 'Failed to search for variable';
					break;
				case 'pathCheckResult':
					const resultDiv = document.getElementById(message.fieldId + '-result');
					if (resultDiv) {
						if (message.success) {
							resultDiv.className = 'field-result success';
							resultDiv.innerHTML = \`✓ Found: <strong>\${escapeHtml(String(message.value))}</strong>\`;
						} else {
							resultDiv.className = 'field-result error';
							resultDiv.textContent = '✗ ' + (message.error || 'Path not found');
						}
					}
					break;
			}
		});

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}
	</script>
</body>
</html>`;
}

/**
 * Generates HTML content for the webview
 */
function getWebviewHtml(webview: vscode.Webview, variableName: string | null, showDebugControls: boolean, treeOrientation: string, showWizard: boolean = false, visualizationConfig?: VisualizationConfig): string {
	const isVertical = treeOrientation === 'vertical';
	
	// If showing wizard, return wizard HTML
	if (showWizard) {
		return getWizardHtml(webview);
	}
	
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Data Structure Visualizer</title>
	<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			display: flex;
			flex-direction: column;
			height: 100vh;
			box-sizing: border-box;
		}
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
			padding-bottom: 10px;
			border-bottom: 1px solid var(--vscode-panel-border);
			flex-shrink: 0;
		}
		.title {
			font-size: 18px;
			font-weight: bold;
		}
		.variable-input-group {
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.variable-input-group input {
			padding: 6px 12px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			font-size: 13px;
			font-family: monospace;
			min-width: 150px;
		}
		.variable-input-group input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}
		.variable-input-group button {
			padding: 6px 16px;
			font-size: 13px;
		}
		.controls {
			display: flex;
			gap: 10px;
			margin-bottom: 20px;
		}
		button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 14px;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.debug-controls {
			display: flex;
			gap: 5px;
			flex-wrap: wrap;
		}
		.debug-controls-vertical {
			position: sticky;
			top: 0;
			display: flex;
			flex-direction: row;
			gap: 5px;
			z-index: 1000;
			background-color: var(--vscode-editor-background);
			padding: 10px 0;
			margin-bottom: 10px;
			border-bottom: 1px solid var(--vscode-panel-border);
			width: 100%;
			flex-shrink: 0;
		}
		.controls {
			flex-shrink: 0;
		}
		.debug-controls-vertical button {
			width: auto;
			text-align: center;
		}
		#tree-container {
			width: 100%;
			flex: 1;
			overflow: auto;
			background-color: var(--vscode-editor-background);
			min-height: 0;
		}
		.node {
			cursor: pointer;
		}
		.node circle {
			fill: var(--vscode-button-background);
			stroke: var(--vscode-panel-border);
			stroke-width: 2px;
		}
		.node-label-indicator {
			font-size: 14px;
			fill: var(--vscode-editor-foreground);
			font-weight: bold;
			pointer-events: none;
			user-select: none;
		}
		.node text {
			fill: var(--vscode-editor-foreground);
			font-size: 12px;
			font-family: monospace;
			pointer-events: none;
			user-select: none;
		}
		.link {
			fill: none;
			stroke: var(--vscode-panel-border);
			stroke-width: 2px;
		}
		.node-info {
			position: fixed;
			top: 100px;
			right: 20px;
			width: 300px;
			max-height: 400px;
			overflow-y: auto;
			background-color: var(--vscode-panel-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 15px;
			display: none;
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		}
		.node-info h3 {
			margin-top: 0;
			margin-bottom: 10px;
		}
		.node-info table {
			width: 100%;
			border-collapse: collapse;
		}
		.node-info td {
			padding: 5px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		.node-info td:first-child {
			font-weight: bold;
			width: 40%;
		}
		.error {
			color: var(--vscode-errorForeground);
			padding: 20px;
			text-align: center;
		}
		.empty {
			color: var(--vscode-descriptionForeground);
			padding: 20px;
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="title">Data Structure Visualizer: <code>${variableName ? escapeHtml(variableName) : ''}</code></div>
		<div class="variable-input-group">
			<button id="change-variable-btn">Change Variable</button>
			<button id="add-visualization-btn">Add Another Visualization</button>
		</div>
	</div>
	
	${showDebugControls && !isVertical ? `
	<div class="controls">
		<div class="debug-controls">
			<button id="step-over">⤵ Step Over</button>
			<button id="step-into">→ Step Into</button>
			<button id="step-out">↑ Step Out</button>
			<button id="continue">▶ Continue</button>
			<span id="size-display" style="display: none; margin-left: 10px; padding: 8px 12px; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; font-size: 13px;"></span>
		</div>
	</div>
	` : ''}
	
	${showDebugControls && isVertical ? `
	<div class="debug-controls-vertical">
		<button id="step-over">⤵ Step Over</button>
		<button id="step-into">→ Step Into</button>
		<button id="step-out">↑ Step Out</button>
		<button id="continue">▶ Continue</button>
		<span id="size-display" style="display: none; margin-left: 10px; padding: 8px 12px; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; font-size: 13px;"></span>
	</div>
	` : ''}
	
	<div id="tree-container"></div>
	<div id="node-info" class="node-info">
		<h3>Node Details</h3>
		<div id="node-info-content"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let treeData = null;
		let svg = null;
		let g = null;
		let nodeInfo = null;
		const treeOrientation = '${treeOrientation}';
		const isVertical = treeOrientation === 'vertical';

		// Initialize
		document.addEventListener('DOMContentLoaded', () => {
			nodeInfo = document.getElementById('node-info');

			// Change variable button handler - opens wizard
			const changeVariableBtn = document.getElementById('change-variable-btn');
			if (changeVariableBtn) {
				changeVariableBtn.addEventListener('click', () => {
					vscode.postMessage({ command: 'openWizard' });
				});
			}

			// Add another visualization button handler - opens new panel with wizard
			const addVisualizationBtn = document.getElementById('add-visualization-btn');
			if (addVisualizationBtn) {
				addVisualizationBtn.addEventListener('click', () => {
					vscode.postMessage({ command: 'addNewVisualization' });
				});
			}

			${showDebugControls ? `
			// Debug controls
			document.getElementById('step-over').addEventListener('click', () => {
				vscode.postMessage({ command: 'debugStepOver' });
			});
			document.getElementById('step-into').addEventListener('click', () => {
				vscode.postMessage({ command: 'debugStepInto' });
			});
			document.getElementById('step-out').addEventListener('click', () => {
				vscode.postMessage({ command: 'debugStepOut' });
			});
			document.getElementById('continue').addEventListener('click', () => {
				vscode.postMessage({ command: 'debugContinue' });
			});
			` : ''}
		});

		// Handle messages from extension
		let currentConfig = null;
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'updateTree':
					treeData = message.data;
					renderTree();
					// Update size display if config has sizePath
					if (currentConfig && currentConfig.sizePath) {
						updateSizeDisplay(currentConfig);
					}
					break;
				case 'updateConfig':
					currentConfig = message.config;
					if (currentConfig && currentConfig.sizePath) {
						updateSizeDisplay(currentConfig);
					} else {
						const sizeDisplay = document.getElementById('size-display');
						if (sizeDisplay) {
							sizeDisplay.style.display = 'none';
						}
					}
					break;
				case 'updateSizeValue':
					const sizeDisplay = document.getElementById('size-display');
					if (sizeDisplay) {
						sizeDisplay.textContent = 'CurrentSize: ' + message.size;
						sizeDisplay.style.display = 'inline-block';
					}
					break;
				case 'updateVariableName':
					// No longer needed since we removed the input field
					break;
			}
		});

		async function updateSizeDisplay(config) {
			const sizeDisplay = document.getElementById('size-display');
			if (!sizeDisplay) return;

			if (!config.sizePath || config.sizePath.trim() === '') {
				sizeDisplay.style.display = 'none';
				return;
			}

			try {
				// Request size value from extension
				vscode.postMessage({ 
					command: 'getSizeValue', 
					variablePath: config.variablePath,
					sizePath: config.sizePath 
				});
			} catch (error) {
				sizeDisplay.style.display = 'none';
			}
		}

		// Auto-refresh is now event-based (triggered by debug actions and state changes)
		// No need for interval-based refresh

		function renderTree() {
			const container = document.getElementById('tree-container');
			container.innerHTML = '';

			if (!treeData) {
				container.innerHTML = '<div class="empty">No data available</div>';
				return;
			}

			if (treeData.error) {
				container.innerHTML = '<div class="error">Error: ' + escapeHtml(treeData.error) + '</div>';
				return;
			}

			if (!treeData.root) {
				container.innerHTML = '<div class="empty">Tree is empty (null root)</div>';
				return;
			}

			// Setup SVG
			const width = container.clientWidth || 800;
			const height = container.clientHeight || 600;
			
			svg = d3.select(container)
				.append('svg')
				.attr('width', width)
				.attr('height', height);

			g = svg.append('g')
				.attr('transform', 'translate(40, 40)');

			// Create tree layout with orientation
			const treeLayout = d3.tree()
				.size(isVertical ? [width - 80, height - 80] : [height - 80, width - 80]);

			// Convert to D3 hierarchy
			const root = d3.hierarchy(treeData.root, d => {
				const children = [];
				if (d.left) children.push(d.left);
				if (d.right) children.push(d.right);
				return children.length > 0 ? children : null;
			});

			// Calculate layout
			treeLayout(root);

			// Draw links with orientation
			const linkGenerator = isVertical 
				? d3.linkVertical().x(d => d.x).y(d => d.y)
				: d3.linkHorizontal().x(d => d.y).y(d => d.x);
			
			const links = g.selectAll('.link')
				.data(root.links())
				.enter()
				.append('path')
				.attr('class', 'link')
				.attr('d', linkGenerator);

			// Draw nodes with orientation
			const nodes = g.selectAll('.node')
				.data(root.descendants())
				.enter()
				.append('g')
				.attr('class', 'node')
				.attr('transform', d => isVertical 
					? 'translate(' + d.x + ',' + d.y + ')' 
					: 'translate(' + d.y + ',' + d.x + ')')
				.on('click', (event, d) => showNodeInfo(d.data));

			// Add circles
			nodes.append('circle')
				.attr('r', 30);

			// Add labels inside circles (centered)
			nodes.append('text')
				.attr('dy', '.35em')
				.attr('x', 0)
				.attr('y', 0)
				.attr('text-anchor', 'middle')
				.attr('font-size', '12px')
				.attr('font-weight', 'bold')
				.attr('fill', 'var(--vscode-editor-foreground)')
				.attr('pointer-events', 'none')
				.text(d => {
					const value = String(d.data.value || 'null');
					// Truncate if too long to fit in circle
					return value.length > 5 ? value.substring(0, 5) + '...' : value;
				});

			// Add L/R indicators on children when parent has only one child
			// The indicator appears on the child node itself
			nodes.each(function(d) {
				// Check if this node is a child and if its parent has only one child
				const parent = d.parent;
				if (!parent) return; // Skip root node
				
				const parentData = parent.data;
				const hasLeft = parentData.left !== undefined && parentData.left !== null;
				const hasRight = parentData.right !== undefined && parentData.right !== null;
				
				// Check if parent has only one child
				if ((hasLeft && !hasRight) || (!hasLeft && hasRight)) {
					// Determine if this node is the left or right child by comparing values
					const isLeftChild = hasLeft && !hasRight && 
					                   parentData.left && String(parentData.left.value) === String(d.data.value);
					const isRightChild = !hasLeft && hasRight && 
					                    parentData.right && String(parentData.right.value) === String(d.data.value);
					
					const indicator = d3.select(this);
					
					if (isLeftChild) {
						// This is the only left child - show L indicator
						indicator.append('text')
							.attr('class', 'node-label-indicator')
							.attr('x', isVertical ? -45 : -45)
							.attr('y', isVertical ? 0 : 0)
							.attr('text-anchor', 'middle')
							.attr('font-size', '14px')
							.attr('font-weight', 'bold')
							.text('L');
					} else if (isRightChild) {
						// This is the only right child - show R indicator
						indicator.append('text')
							.attr('class', 'node-label-indicator')
							.attr('x', isVertical ? 45 : 45)
							.attr('y', isVertical ? 0 : 0)
							.attr('text-anchor', 'middle')
							.attr('font-size', '14px')
							.attr('font-weight', 'bold')
							.text('R');
					}
				}
			});
		}

		function showNodeInfo(nodeData) {
			const content = document.getElementById('node-info-content');
			if (!nodeData) {
				content.innerHTML = '<p>No additional information available</p>';
				nodeInfo.style.display = 'block';
				return;
			}

			let html = '<table>';
			
			// Show key if available
			if (nodeData.key !== undefined) {
				html += '<tr><td><strong>Key:</strong></td><td>' + escapeHtml(String(nodeData.key)) + '</td></tr>';
			}
			
			// Show value if available (and different from key)
			if (nodeData.val !== undefined) {
				html += '<tr><td><strong>Value:</strong></td><td>' + escapeHtml(String(nodeData.val)) + '</td></tr>';
			}
			
			// Show other attributes
			if (nodeData.attributes) {
				for (const [key, value] of Object.entries(nodeData.attributes)) {
					// Skip if already shown as key or value
					if (nodeData.key !== undefined && String(value) === String(nodeData.key)) continue;
					if (nodeData.val !== undefined && String(value) === String(nodeData.val)) continue;
					html += '<tr><td>' + escapeHtml(String(key)) + '</td><td>' + escapeHtml(String(value)) + '</td></tr>';
				}
			}
			
			html += '</table>';
			content.innerHTML = html;
			nodeInfo.style.display = 'block';
		}

		// Close node info when clicking outside
		document.addEventListener('click', (e) => {
			if (!nodeInfo.contains(e.target) && !e.target.closest('.node')) {
				nodeInfo.style.display = 'none';
			}
		});

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		// Handle window resize
		window.addEventListener('resize', () => {
			if (treeData) {
				renderTree();
			}
		});
	</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function deactivate() {}


