// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { createOrRevealPanel, updateWebviewContent, refreshVisualization, refreshVisualizationWithConfig, refreshAllVisualizations, WebviewManagerDependencies } from './webviewManager';
import { initRatingPrompt } from './ratingPrompt';
import { getCurrentFrameId, rememberStoppedThread } from './debugAdapter';
import { detectStructureAt } from './structureDetector';

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
		starters: new Map(),
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
				vscode.window.showErrorMessage('No active debug session. Set a breakpoint, start debugging (F5) and open the visualizer when the program stops.');
				return;
			}
			if (await getCurrentFrameId() === undefined) {
				vscode.window.showInformationMessage('The program is still running. Set a breakpoint where your data structure exists and open the visualizer when the debugger stops there.');
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
	 * Command: Visualize Data Structure (right-click a variable in the Variables view)
	 */
	const visualizeVariableCommand = vscode.commands.registerCommand(
		'dataStructuresVisualizer.visualizeVariable',
		async (arg?: { variable?: { name: string; value?: string; type?: string; evaluateName?: string; variablesReference?: number; indexedVariables?: number } }) => {
			const variable = arg?.variable;
			if (!variable) {
				await vscode.commands.executeCommand('dataStructuresVisualizer.openVisualizer');
				return;
			}
			const path = variable.evaluateName || variable.name;
			try {
				const detected = await detectStructureAt(path, { ...variable, name: path });
				if (!detected) {
					vscode.window.showInformationMessage(`No supported data structure found in "${path}". Open the visualizer to set the paths of a binary tree yourself.`);
					return;
				}
				const panel = await createOrRevealPanel('variable_' + path, deps);
				await deps.starters.get(panel)!(detected.config);
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to visualize "${path}": ${error.message}`);
			}
		}
	);

	/**
	 * Status bar button while debugging
	 */
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.text = '$(graph) Visualize';
	statusBarItem.tooltip = 'Open Data Structure Visualizer (Cmd+K Cmd+V / Ctrl+K Ctrl+V)';
	statusBarItem.command = 'dataStructuresVisualizer.openVisualizer';
	const updateStatusBar = () => vscode.debug.activeDebugSession ? statusBarItem.show() : statusBarItem.hide();
	updateStatusBar();

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
		updateStatusBar();
		if (session) {
			await refreshAllVisualizations(deps);
		}
	});

	// Backup trigger: the focused frame changes after every step, and when another frame
	// is selected in the Call Stack view (VS Code 1.90+)
	const onStackItem = (vscode.debug as any).onDidChangeActiveStackItem as vscode.Event<unknown> | undefined;
	const stackItemListener = onStackItem
		? onStackItem(() => { void refreshAllVisualizations(deps); })
		: new vscode.Disposable(() => {});

		// ========================================================================
	// REGISTER COMMANDS AND SUBSCRIPTIONS
		// ========================================================================
		
	// Register all subscriptions
	context.subscriptions.push(
		openVisualizerCommand, 
		visualizeVariableCommand,
		refreshCommand,
		statusBarItem,
		stackItemListener,
		debugStoppedTracker,
		debugSessionListener
	);
}

export function deactivate() {}
