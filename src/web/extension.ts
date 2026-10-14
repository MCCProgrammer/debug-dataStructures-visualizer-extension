// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { createOrRevealPanel, updateWebviewContent, refreshVisualization, refreshVisualizationWithConfig, refreshAllVisualizations, WebviewManagerDependencies } from './webviewManager';
import { initRatingPrompt } from './ratingPrompt';
import { rememberStoppedThread } from './debugAdapter';

export function activate(context: vscode.ExtensionContext) {
	console.log('Data Structures Visualizer extension is now active!');
	initRatingPrompt(context);

	// Map to track active visualization panels
		const activePanels = new Map<string, vscode.WebviewPanel>();
		
	// Map to track visualization configurations for each panel
	const panelConfigs = new Map<string, VisualizationConfig>();
	
	// Cache for previously visualized variables
	const visualizationCache = new Map<string, VisualizationConfig[]>();

	// Dependencies for webview manager
	const deps: WebviewManagerDependencies = {
		context,
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
			const active = Array.from(activePanels.entries()).find(([, p]) => p.active) ||
				Array.from(activePanels.entries()).find(([, p]) => p.visible);
			if (!active) {
				vscode.window.showInformationMessage('No active visualization panel found.');
				return;
			}

			const [panelId, activePanel] = active;
			const panelConfig = panelConfigs.get(panelId);
			if (panelConfig) {
				await refreshVisualizationWithConfig(activePanel, panelConfig);
				return;
			}

			// Panels without a configuration: extract variable name from panel title
			const match = activePanel.title.match(/Data Structure Visualizer: (.+)/);
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
	// "stopped" is a standard DAP event, so it never reaches onDidReceiveDebugSessionCustomEvent:
	// a tracker sees it whether the step came from the panel, the debug toolbar or a shortcut
	const debugStoppedTracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session) => ({
			onDidSendMessage: (message: any) => {
				if (message.type === 'event' && message.event === 'stopped') {
					rememberStoppedThread(session.id, message.body?.threadId);
					void refreshAllVisualizations(deps);
				}
			}
		})
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
		debugStoppedTracker,
		debugSessionListener
	);
}

export function deactivate() {}
