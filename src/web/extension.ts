// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { createOrRevealPanel, updateWebviewContent, refreshVisualization, refreshAllVisualizations, WebviewManagerDependencies } from './webviewManager';

export function activate(context: vscode.ExtensionContext) {
	console.log('Data Structures Visualizer extension is now active!');

	// Map to track active visualization panels
		const activePanels = new Map<string, vscode.WebviewPanel>();
		
	// Map to track visualization configurations for each panel
	const panelConfigs = new Map<string, VisualizationConfig>();
	
	// Cache for previously visualized variables
	const visualizationCache = new Map<string, VisualizationConfig[]>();

	// Dependencies for webview manager
	const deps: WebviewManagerDependencies = {
		activePanels,
		panelConfigs,
		visualizationCache
	};

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
				const panel = await createOrRevealPanel('wizard', deps);
				updateWebviewContent(panel, null, true, undefined, undefined, deps); // true = show wizard
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
	 * Auto-refresh visualization when debug state changes (always enabled)
	 */
	const config = vscode.workspace.getConfiguration('dataStructuresVisualizer');
	const delay = config.get<number>('autoRefreshInterval', 300);
	
	// Listen for debug session custom events (breakpoint hits, step, etc.)
	const debugCustomEventListener = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
		// Refresh when debugger stops (breakpoint hit, step, etc.)
		if (e.event === 'stopped' || e.event === 'breakpoint' || e.event === 'step') {
			await refreshAllVisualizations(deps);
		}
	});

	// Listen for when debug session becomes active (might have stopped)
	const debugSessionListener = vscode.debug.onDidChangeActiveDebugSession(async (session) => {
		if (session) {
			await refreshAllVisualizations(deps);
		}
	});

		// ========================================================================
	// REGISTER COMMANDS AND SUBSCRIPTIONS
		// ========================================================================
		
	// Register all subscriptions
	context.subscriptions.push(
		openVisualizerCommand, 
		refreshCommand,
		debugCustomEventListener, 
		debugSessionListener
	);
}

export function deactivate() {}
