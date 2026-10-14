// ============================================================================
// WEBVIEW MANAGEMENT FUNCTIONS
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig, TreeData } from './types';
import { searchVariableInAllScopes, getCurrentFrameId, evaluateVariable } from './debugAdapter';
import { getTreeData, getTreeDataWithConfig } from './treeBuilder';
import { getWebviewHtml } from './htmlGenerator';
import { detectTrees, detectStructureAt } from './structureDetector';
import { hasContent } from './structureBuilder';
import { recordSuccessfulVisualization } from './ratingPrompt';
import { cleanValue } from './utils';

export interface WebviewManagerDependencies {
	context: vscode.ExtensionContext;
	// Starts a visualization in a panel without going through its wizard
	starters: Map<vscode.WebviewPanel, (config: VisualizationConfig) => Promise<void>>;
	activePanels: Map<string, vscode.WebviewPanel>;
	panelConfigs: Map<string, VisualizationConfig>;
	visualizationCache: Map<string, VisualizationConfig[]>;
}

/**
 * Creates or reveals the visualization panel
 */
export async function createOrRevealPanel(
	variableName: string,
	deps: WebviewManagerDependencies
): Promise<vscode.WebviewPanel> {
	const panelId = `visualizer_${variableName}`;
	let panel = deps.activePanels.get(panelId);

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
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(deps.context.extensionUri, 'dist', 'media')]
		}
	);

	deps.activePanels.set(panelId, panel);

	// Handle panel disposal
	panel.onDidDispose(() => {
		deps.activePanels.delete(panelId);
		deps.panelConfigs.delete(panelId);
	});

	// Store current variable name for this panel
	let currentVariableName = variableName;
	let currentConfig: VisualizationConfig | null = null;

	async function start(config: VisualizationConfig) {
		currentConfig = config;
		currentVariableName = config.variablePath;
		deps.panelConfigs.set(panelId, config);
		const displayName = config.label || config.treePath || config.variablePath;
		panel!.title = `Data Structure Visualizer: ${displayName}`;

		// Save to cache (last 10 configurations of this debug session)
		const sessionId = vscode.debug.activeDebugSession?.id || 'default';
		if (!deps.visualizationCache.has(sessionId)) {
			deps.visualizationCache.set(sessionId, []);
		}
		const cache = deps.visualizationCache.get(sessionId)!;
		const exists = cache.some(c =>
			c.variablePath === config.variablePath &&
			c.visualizationType === config.visualizationType &&
			c.treePath === config.treePath
		);
		if (!exists) {
			cache.push({ ...config });
			if (cache.length > 10) {
				cache.shift();
			}
		}

		updateWebviewContent(panel!, displayName, false, config, undefined, deps);
		const treeData = await refreshVisualizationWithConfig(panel!, config);
		if (hasContent(treeData)) {
			void recordSuccessfulVisualization(deps.context, vscode.debug.activeDebugSession?.id);
		}
	}

	deps.starters.set(panel, start);
	panel.onDidDispose(() => deps.starters.delete(panel!));

	// Handle messages from webview
	panel.webview.onDidReceiveMessage(async (message) => {
		switch (message.command) {
			case 'detectTrees':
				// Wizard opened: offer the trees found in the current frame
				try {
					const trees = await detectTrees();
					panel.webview.postMessage({ command: 'detectedTrees', trees });
				} catch (error: any) {
					panel.webview.postMessage({ command: 'detectedTrees', trees: [], error: error.message || 'Failed to detect trees' });
				}
				break;
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
				await start(message.config as VisualizationConfig);
				break;
			case 'autoDetectVariable':
				// Wizard step 2 "Detect automatically": find the structure of the chosen variable
				try {
					const evalResult = await evaluateVariable(message.variablePath, await getCurrentFrameId());
					const detected = await detectStructureAt(message.variablePath, {
						name: message.variablePath,
						value: evalResult?.result,
						type: evalResult?.type,
						variablesReference: evalResult?.variablesReference,
						indexedVariables: evalResult?.indexedVariables
					});
					if (detected) {
						await start(detected.config);
					} else {
						panel.webview.postMessage({ command: 'autoDetectError', error: `No supported data structure found in "${message.variablePath}".` });
					}
				} catch (error: any) {
					panel.webview.postMessage({ command: 'autoDetectError', error: error.message || 'Failed to detect the structure' });
				}
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
				updateWebviewContent(panel, null, true, undefined, undefined, deps);
				break;
			case 'openWizardWithConfig':
				// Open wizard at step 3 with current config filled
				const currentConfigForWizard = deps.panelConfigs.get(panelId);
				if (currentConfigForWizard) {
					updateWebviewContent(panel, null, true, undefined, currentConfigForWizard, deps);
					// Send config to webview to fill form
					panel.webview.postMessage({
						command: 'fillWizardWithConfig',
						config: currentConfigForWizard
					});
				} else {
					// No config, just open wizard normally
					updateWebviewContent(panel, null, true, undefined, undefined, deps);
				}
				break;
			case 'addNewVisualization':
				// Open a new panel with wizard (doesn't close current one)
				try {
					const newPanel = await createOrRevealPanel('wizard_' + Date.now(), deps);
					updateWebviewContent(newPanel, null, true, undefined, undefined, deps);
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
						value = cleanValue(evalResult.result);
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
						sizeValue = String(cleanValue(sizeEval.result));
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
					updateWebviewContent(panel, newVariableName, false, undefined, undefined, deps);
					// Refresh visualization with new variable
					await refreshVisualization(panel, newVariableName);
				}
				break;
			// The panels refresh when the debugger reports "stopped" (see the tracker in extension.ts)
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
		}
	});

	return panel;
}

/**
 * Refreshes the visualization with current tree data
 */
export async function refreshVisualization(panel: vscode.WebviewPanel, variableName: string) {
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
export async function refreshVisualizationWithConfig(panel: vscode.WebviewPanel, config: VisualizationConfig): Promise<TreeData> {
	let treeData: TreeData;
	try {
		treeData = await getTreeDataWithConfig(config);
	} catch (error: any) {
		treeData = {
			root: null,
			error: error.message || 'Failed to build tree'
		};
	}
	panel.webview.postMessage({
		command: 'updateTree',
		data: treeData
	});
	return treeData;
}

/**
 * Updates the webview HTML content
 */
export function updateWebviewContent(
	panel: vscode.WebviewPanel,
	variableName: string | null,
	showWizard: boolean = false,
	visualizationConfig: VisualizationConfig | undefined,
	wizardConfig: VisualizationConfig | undefined,
	deps: WebviewManagerDependencies
) {
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const showDebugControls = config.get<boolean>('showDebugControls', true);
	const treeOrientation = config.get<string>('treeOrientation', 'horizontal');
	
	// Get cache for current session
	const sessionId = vscode.debug.activeDebugSession?.id || 'default';
	const cache = deps.visualizationCache.get(sessionId) || [];

	panel.webview.html = getWebviewHtml(panel.webview, deps.context.extensionUri, variableName, showDebugControls, treeOrientation, showWizard, visualizationConfig, cache, wizardConfig);
	
	// If we have a config, send it to the webview for size display
	if (visualizationConfig && !showWizard) {
		panel.webview.postMessage({
			command: 'updateConfig',
			config: visualizationConfig
		});
	}
}

/**
 * Refreshes all active visualizations
 */
// Several triggers fire on the same stop (debug adapter event, active frame change): refresh once
let pendingRefresh: ReturnType<typeof setTimeout> | undefined;

export async function refreshAllVisualizations(deps: WebviewManagerDependencies) {
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const delay = config.get<number>('autoRefreshInterval', 300);

	if (pendingRefresh) {
		clearTimeout(pendingRefresh);
	}
	pendingRefresh = setTimeout(async () => {
		pendingRefresh = undefined;
		// Refresh all active panels
		for (const [panelId, panel] of deps.activePanels.entries()) {
			if (panel.visible) {
				const config = deps.panelConfigs.get(panelId);
				if (config) {
					await refreshVisualizationWithConfig(panel, config);
				} else {
					const match = panelId.match(/visualizer_(.+)/);
					if (match && match[1] && !match[1].startsWith('wizard')) {
						await refreshVisualization(panel, match[1]);
					}
				}
			}
		}
	}, delay);
}

