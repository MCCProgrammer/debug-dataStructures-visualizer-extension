// ============================================================================
// WEBVIEW MANAGEMENT FUNCTIONS
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig, TreeData } from './types';
import { searchVariableInAllScopes, getCurrentFrameId, evaluateVariable } from './debugAdapter';
import { getTreeData, getTreeDataWithConfig } from './treeBuilder';
import { getWebviewHtml } from './htmlGenerator';

export interface WebviewManagerDependencies {
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
			retainContextWhenHidden: true
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
				deps.panelConfigs.set(panelId, currentConfig);
				panel.title = `Data Structure Visualizer: ${currentConfig.variablePath}`;
				
				// Save to cache
				const sessionId = vscode.debug.activeDebugSession?.id || 'default';
				if (!deps.visualizationCache.has(sessionId)) {
					deps.visualizationCache.set(sessionId, []);
				}
				const cache = deps.visualizationCache.get(sessionId)!;
				// Check if config already exists in cache
				if (currentConfig) {
					const config = currentConfig;
					const exists = cache.some(c => 
						c.variablePath === config.variablePath &&
						c.visualizationType === config.visualizationType &&
						c.treePath === config.treePath
					);
					if (!exists) {
						cache.push({ ...config });
						// Keep only last 10 configurations
						if (cache.length > 10) {
							cache.shift();
						}
					}
				}
				
				updateWebviewContent(panel, currentConfig.variablePath, false, currentConfig, undefined, deps);
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
					updateWebviewContent(panel, newVariableName, false, undefined, undefined, deps);
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
export async function refreshVisualizationWithConfig(panel: vscode.WebviewPanel, config: VisualizationConfig) {
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
export function updateWebviewContent(
	panel: vscode.WebviewPanel,
	variableName: string | null,
	showWizard: boolean = false,
	visualizationConfig?: VisualizationConfig,
	wizardConfig?: VisualizationConfig,
	deps?: WebviewManagerDependencies
) {
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const showDebugControls = config.get<boolean>('showDebugControls', true);
	const treeOrientation = config.get<string>('treeOrientation', 'horizontal');
	
	// Get cache for current session
	const sessionId = vscode.debug.activeDebugSession?.id || 'default';
	const cache = deps ? (deps.visualizationCache.get(sessionId) || []) : [];

	panel.webview.html = getWebviewHtml(panel.webview, variableName, showDebugControls, treeOrientation, showWizard, visualizationConfig, cache, wizardConfig);
	
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
export async function refreshAllVisualizations(deps: WebviewManagerDependencies) {
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const delay = config.get<number>('autoRefreshInterval', 300);
	
	setTimeout(async () => {
		// Refresh all active panels
		for (const [panelId, panel] of deps.activePanels.entries()) {
			if (panel.visible) {
				const config = deps.panelConfigs.get(panelId);
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

