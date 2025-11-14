import * as vscode from 'vscode';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface TreeNode {
	id: string;
	value: string | number;
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

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
	console.log('Data Structures Visualizer extension is now active!');

	// Map to track active visualization panels
	const activePanels = new Map<string, vscode.WebviewPanel>();

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
		});

		// Handle messages from webview
		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case 'refresh':
					await refreshVisualization(panel!, variableName);
					break;
				case 'debugStepOver':
					await vscode.commands.executeCommand('workbench.action.debug.stepOver');
					break;
				case 'debugStepInto':
					await vscode.commands.executeCommand('workbench.action.debug.stepInto');
					break;
				case 'debugStepOut':
					await vscode.commands.executeCommand('workbench.action.debug.stepOut');
					break;
				case 'debugContinue':
					await vscode.commands.executeCommand('workbench.action.debug.continue');
					break;
				case 'debugPause':
					await vscode.commands.executeCommand('workbench.action.debug.pause');
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
	}

	/**
	 * Updates the webview HTML content
	 */
	function updateWebviewContent(panel: vscode.WebviewPanel, variableName: string) {
		const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
		const showDebugControls = config.get<boolean>('showDebugControls', true);

		panel.webview.html = getWebviewHtml(panel.webview, variableName, showDebugControls);
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

			// Ask user for variable name
			const variableName = await vscode.window.showInputBox({
				prompt: 'Enter the variable name to visualize (e.g., root, tree.root, myBST)',
				placeHolder: 'root',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Variable name cannot be empty';
					}
					return null;
				}
			});

			if (!variableName) {
				return;
			}

			try {
				const panel = await createOrRevealPanel(variableName);
				updateWebviewContent(panel, variableName);
				
				// Initial refresh
				await refreshVisualization(panel, variableName);
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
	// DEBUG STATE LISTENERS
	// ========================================================================

	/**
	 * Auto-refresh visualization when debug state changes
	 */
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	if (config.get<boolean>('autoRefresh', true)) {
		// Listen for debug session custom events (breakpoint hits, step, etc.)
		const debugCustomEventListener = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
			// Refresh when debugger stops (breakpoint hit, step, etc.)
			if (e.event === 'stopped' || e.event === 'breakpoint' || e.event === 'step') {
				// Refresh all active panels
				for (const [panelId, panel] of activePanels.entries()) {
					if (panel.visible) {
						const match = panelId.match(/visualizer_(.+)/);
						if (match && match[1]) {
							await refreshVisualization(panel, match[1]);
						}
					}
				}
			}
		});

		// Also listen for when debug session becomes active (might have stopped)
		const debugSessionListener = vscode.debug.onDidChangeActiveDebugSession(async (session) => {
			if (session) {
				// Small delay to ensure session state is updated
				setTimeout(async () => {
					// Refresh all active panels when debug session changes
					for (const [panelId, panel] of activePanels.entries()) {
						if (panel.visible) {
							const match = panelId.match(/visualizer_(.+)/);
							if (match && match[1]) {
								await refreshVisualization(panel, match[1]);
							}
						}
					}
				}, 100);
			}
		});

		context.subscriptions.push(debugCustomEventListener, debugSessionListener);
	}

	// ========================================================================
	// REGISTER COMMANDS
	// ========================================================================

	context.subscriptions.push(openVisualizerCommand, refreshCommand);
}

/**
 * Generates HTML content for the webview
 */
function getWebviewHtml(webview: vscode.Webview, variableName: string, showDebugControls: boolean): string {
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
		}
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
			padding-bottom: 10px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		.title {
			font-size: 18px;
			font-weight: bold;
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
		#tree-container {
			width: 100%;
			height: calc(100vh - 200px);
			overflow: auto;
			background-color: var(--vscode-editor-background);
		}
		.node {
			cursor: pointer;
		}
		.node circle {
			fill: var(--vscode-button-background);
			stroke: var(--vscode-panel-border);
			stroke-width: 2px;
		}
		.node text {
			fill: var(--vscode-editor-foreground);
			font-size: 12px;
			font-family: monospace;
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
		<div class="title">Data Structure Visualizer: <code>${escapeHtml(variableName)}</code></div>
		<button id="refresh-btn">🔄 Refresh</button>
	</div>
	
	${showDebugControls ? `
	<div class="controls">
		<div class="debug-controls">
			<button id="step-over">⤵ Step Over</button>
			<button id="step-into">→ Step Into</button>
			<button id="step-out">↑ Step Out</button>
			<button id="continue">▶ Continue</button>
			<button id="pause">⏸ Pause</button>
		</div>
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

		// Initialize
		document.addEventListener('DOMContentLoaded', () => {
			nodeInfo = document.getElementById('node-info');
			
			// Refresh button
			document.getElementById('refresh-btn').addEventListener('click', () => {
				vscode.postMessage({ command: 'refresh' });
			});

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
			document.getElementById('pause').addEventListener('click', () => {
				vscode.postMessage({ command: 'debugPause' });
			});
			` : ''}
		});

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'updateTree':
					treeData = message.data;
					renderTree();
					break;
			}
		});

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

			// Create tree layout
			const treeLayout = d3.tree()
				.size([height - 80, width - 80]);

			// Convert to D3 hierarchy
			const root = d3.hierarchy(treeData.root, d => {
				const children = [];
				if (d.left) children.push(d.left);
				if (d.right) children.push(d.right);
				return children.length > 0 ? children : null;
			});

			// Calculate layout
			treeLayout(root);

			// Draw links
			const links = g.selectAll('.link')
				.data(root.links())
				.enter()
				.append('path')
				.attr('class', 'link')
				.attr('d', d3.linkHorizontal()
					.x(d => d.y)
					.y(d => d.x)
				);

			// Draw nodes
			const nodes = g.selectAll('.node')
				.data(root.descendants())
				.enter()
				.append('g')
				.attr('class', 'node')
				.attr('transform', d => 'translate(' + d.y + ',' + d.x + ')')
				.on('click', (event, d) => showNodeInfo(d.data));

			// Add circles
			nodes.append('circle')
				.attr('r', 20);

			// Add labels
			nodes.append('text')
				.attr('dy', '.35em')
				.attr('x', d => d.children ? -25 : 25)
				.attr('text-anchor', d => d.children ? 'end' : 'start')
				.text(d => String(d.data.value || 'null'));
		}

		function showNodeInfo(nodeData) {
			const content = document.getElementById('node-info-content');
			if (!nodeData || !nodeData.attributes) {
				content.innerHTML = '<p>No additional information available</p>';
				nodeInfo.style.display = 'block';
				return;
			}

			let html = '<table>';
			for (const [key, value] of Object.entries(nodeData.attributes)) {
				html += '<tr><td>' + escapeHtml(String(key)) + '</td><td>' + escapeHtml(String(value)) + '</td></tr>';
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
