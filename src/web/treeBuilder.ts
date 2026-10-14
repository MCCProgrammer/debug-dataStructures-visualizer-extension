// ============================================================================
// TREE BUILDING FUNCTIONS
// ============================================================================

import * as vscode from 'vscode';
import { TreeNode, TreeData, VisualizationConfig } from './types';
import { getCurrentFrameId, evaluateVariable, getVariableChildren, getVariables } from './debugAdapter';
import { getNodeShape } from './structureDetector';
import { buildStructure } from './structureBuilder';
import { cleanValue } from './utils';

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
			// Skip debugger groupings such as debugpy's "special variables"
			if (!/\s/.test(child.name)) {
				attributes[child.name] = cleanValue(child.value);
			}
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
export async function getTreeData(variableName: string): Promise<TreeData> {
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

		// Child paths left empty (e.g. a tree detected while still empty): detect them from this node
		if (!config.leftPath || !config.rightPath) {
			const shape = await getNodeShape(children, { remaining: 1 });
			if (shape) {
				config = {
					...config,
					leftPath: config.leftPath || shape.leftPath,
					rightPath: config.rightPath || shape.rightPath,
					keyPath: config.keyPath || shape.keyPath,
					valuePath: config.valuePath || shape.valuePath
				};
			}
		}
		
		// Build attributes map
		const attributes: Record<string, any> = {};
		for (const child of children) {
			// Skip debugger groupings such as debugpy's "special variables"
			if (!/\s/.test(child.name)) {
				attributes[child.name] = cleanValue(child.value);
			}
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
					nodeKey = String(cleanValue(keyEval.result));
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
					nodeValue = String(cleanValue(valueEval.result));
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

		// Key/value fields of the node itself show the evaluated value (Java lists `Integer@24` as the field value)
		if (config.keyPath && nodeKey !== undefined && attributes[config.keyPath] !== undefined) {
			attributes[config.keyPath] = nodeKey;
		}
		if (config.valuePath && nodeValue !== undefined && attributes[config.valuePath] !== undefined) {
			attributes[config.valuePath] = nodeValue;
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

/**
 * Gets tree data using a configuration with paths
 */
export async function getTreeDataWithConfig(config: VisualizationConfig): Promise<TreeData> {
	try {
		if (config.visualizationType !== 'binaryTree') {
			return await buildStructure(config);
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

