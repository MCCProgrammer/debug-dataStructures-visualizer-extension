// ============================================================================
// HTML GENERATION FUNCTIONS
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { escapeHtml } from './utils';

/**
 * Generates HTML content for the wizard
 */
export function getWizardHtml(webview: vscode.Webview, cache: VisualizationConfig[] = [], wizardConfig?: VisualizationConfig): string {
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
				<label for="variable-name-input">Variable Name:</label>
				<input type="text" id="variable-name-input" placeholder="e.g., root, tree, myBST" autofocus>
				<div class="help-text">Enter the name of the variable you want to visualize.</div>
			</div>
			<div id="variable-search-results" class="variable-locations" style="display: none;"></div>
			<div id="variable-search-error" class="error-message" style="display: none;"></div>
			<div id="variable-search-loading" class="loading" style="display: none;">Searching for variable...</div>
			<div class="button-group">
				<button id="search-variable-btn">Search</button>
			</div>
			
			<!-- Cache Display (only on step 1) -->
			<div id="cache-section" style="display: ${cache.length > 0 ? 'block' : 'none'}; margin-top: 30px; padding: 15px; background-color: var(--vscode-list-hoverBackground); border-radius: 4px;">
				<h3 style="margin-top: 0; margin-bottom: 10px;">Previously Visualized Variables</h3>
				<div id="cache-list" style="display: flex; flex-direction: column; gap: 8px;">
					${cache.map((c, idx) => `
						<div class="cache-item-wrapper" data-index="${idx}" style="padding: 8px; background-color: var(--vscode-list-activeSelectionBackground); border-radius: 4px; border: 1px solid var(--vscode-list-activeSelectionBackground);">
							<div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
								<div style="flex: 1; cursor: pointer;" class="cache-item">
									<div style="font-weight: bold; font-family: monospace;">${escapeHtml(c.variablePath)}</div>
									<div style="font-size: 12px; color: var(--vscode-descriptionForeground);">Type: ${c.visualizationType}${c.treePath ? ` | Tree: ${escapeHtml(c.treePath)}` : ''}</div>
								</div>
								<button class="cache-edit-btn" data-index="${idx}" style="padding: 4px 8px; background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-button-border); border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">Edit</button>
							</div>
						</div>
					`).join('')}
				</div>
				<div style="margin-top: 10px; font-size: 12px; color: var(--vscode-descriptionForeground);">Click on a cached configuration to reuse it immediately, or click "Edit" to fill the form and reuse some fields.</div>
			</div>
		</div>
		
		<!-- Step 2: Visualization Type -->
		<div class="wizard-step" id="step2">
			<h2>Step 2: Visualization Type</h2>
			<div class="form-group">
				<label for="visualization-type">Data Structure Type:</label>
				<select id="visualization-type">
					<option value="binaryTree">Binary Tree</option>
					<option value="doublyLinkedList" disabled>Doubly Linked List (Coming Soon)</option>
				</select>
				<div class="help-text">Select the type of data structure you want to visualize.</div>
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
				<label for="tree-path">Tree Root Path:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="tree-path-prefix"></span>
						<input type="text" id="tree-path" placeholder="e.g., root">
					</div>
					<button type="button" class="check-btn" data-field="tree-path">Check</button>
				</div>
				<div class="help-text">Path from the variable to the actual tree root node. Leave empty if the tree root is the variable itself.</div>
				<div id="tree-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="size-path">Size Attribute Path (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="size-path-prefix"></span>
						<input type="text" id="size-path" placeholder="e.g., size">
					</div>
					<button type="button" class="check-btn" data-field="size-path">Check</button>
				</div>
				<div class="help-text">Path to the attribute that stores the current size of the tree. Leave empty if your tree doesn't track size.</div>
				<div id="size-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="left-path">Left Child Attribute Name:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="left-path-prefix"></span>
						<input type="text" id="left-path" placeholder="e.g., left" value="left">
					</div>
					<button type="button" class="check-btn" data-field="left-path">Check</button>
				</div>
				<div class="help-text">Name of the attribute that points to the left child node of root. Default is "left".</div>
				<div id="left-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="right-path">Right Child Attribute Name:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="right-path-prefix"></span>
						<input type="text" id="right-path" placeholder="e.g., right" value="right">
					</div>
					<button type="button" class="check-btn" data-field="right-path">Check</button>
				</div>
				<div class="help-text">Name of the attribute that points to the right child node of root. Default is "right".</div>
				<div id="right-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="key-path">Node Key Attribute (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="key-path-prefix"></span>
						<input type="text" id="key-path" placeholder="e.g., key">
					</div>
					<button type="button" class="check-btn" data-field="key-path">Check</button>
				</div>
				<div class="help-text">Path to the attribute that stores the node's key value. This value will be displayed inside the node circle in the visualization. If your implementation of tree uses EntryClass, you can get key for example wity (element or entry).getKey().value. </div>
				<div id="key-path-result" class="field-result" style="display: none; margin-top: 5px;"></div>
			</div>
			<div class="form-group">
				<label for="value-path">Node Value Attribute (optional):</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<div class="path-input-group" style="flex: 1;">
						<span class="path-prefix" id="value-path-prefix"></span>
						<input type="text" id="value-path" placeholder="e.g., val, value">
					</div>
					<button type="button" class="check-btn" data-field="value-path">Check</button>
				</div>
				<div class="help-text">Path to the attribute that stores the node's value. If key is leave empty this will be in the node circle otherwise it will be shown in the details panel when you click on a node.</div>
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
		const variableNameInput = document.getElementById('variable-name-input');
		if (variableNameInput) {
			variableNameInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					document.getElementById('search-variable-btn').click();
				}
			});
		}

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

		// Enter key handlers for path inputs (trigger check)
		const pathInputs = ['tree-path', 'size-path', 'left-path', 'right-path', 'key-path', 'value-path'];
		pathInputs.forEach(fieldId => {
			const input = document.getElementById(fieldId);
			if (input) {
				input.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						const checkBtn = document.querySelector(\`.check-btn[data-field="\${fieldId}"]\`);
						if (checkBtn) {
							checkBtn.click();
						}
					}
				});
			}
		});

		// Cache item click handlers
		const cacheData = ${JSON.stringify(cache)};
		
		// Click on cache item - directly start visualization
		document.querySelectorAll('.cache-item').forEach(item => {
			item.addEventListener('click', () => {
				const wrapper = item.closest('.cache-item-wrapper');
				if (!wrapper) return;
				const index = parseInt(wrapper.getAttribute('data-index'));
				const cachedConfig = cacheData[index];
				if (cachedConfig) {
					// Directly start visualization with cached config
					vscode.postMessage({ command: 'startVisualization', config: cachedConfig });
				}
			});
		});

		// Edit button - fill form but don't submit
		document.querySelectorAll('.cache-edit-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation(); // Prevent triggering the cache item click
				const index = parseInt(btn.getAttribute('data-index'));
				const cachedConfig = cacheData[index];
				if (cachedConfig) {
					// Fill in the form with cached config
					selectedVariablePath = cachedConfig.variablePath;
					document.getElementById('variable-name-input').value = cachedConfig.variablePath.split('.').pop() || '';
					document.getElementById('visualization-type').value = cachedConfig.visualizationType;
					
					// Go to step 3 and fill in paths
					showStep(3);
					updatePathPrefixes();
					
					if (cachedConfig.treePath) {
						const treePathParts = cachedConfig.treePath.split('.');
						const treePathSuffix = treePathParts.slice(1).join('.');
						document.getElementById('tree-path').value = treePathSuffix;
						updatePathPrefixes();
					}
					
					document.getElementById('size-path').value = cachedConfig.sizePath || '';
					document.getElementById('left-path').value = cachedConfig.leftPath || 'left';
					document.getElementById('right-path').value = cachedConfig.rightPath || 'right';
					document.getElementById('key-path').value = cachedConfig.keyPath || '';
					document.getElementById('value-path').value = cachedConfig.valuePath || '';
					
					// Trigger search to select the variable
					vscode.postMessage({ command: 'searchVariable', variableName: cachedConfig.variablePath.split('.').pop() || '' });
				}
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
				case 'fillWizardWithConfig':
					// Fill wizard with provided config and go to step 3
					const config = message.config;
					if (config) {
						selectedVariablePath = config.variablePath;
						document.getElementById('variable-name-input').value = config.variablePath.split('.').pop() || '';
						document.getElementById('visualization-type').value = config.visualizationType;
						
						// Go to step 3 and fill in paths
						showStep(3);
						updatePathPrefixes();
						
						if (config.treePath) {
							const treePathParts = config.treePath.split('.');
							const treePathSuffix = treePathParts.slice(1).join('.');
							document.getElementById('tree-path').value = treePathSuffix;
							updatePathPrefixes();
						}
						
						document.getElementById('size-path').value = config.sizePath || '';
						document.getElementById('left-path').value = config.leftPath || 'left';
						document.getElementById('right-path').value = config.rightPath || 'right';
						document.getElementById('key-path').value = config.keyPath || '';
						document.getElementById('value-path').value = config.valuePath || '';
					}
					break;
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
export function getWebviewHtml(webview: vscode.Webview, variableName: string | null, showDebugControls: boolean, treeOrientation: string, showWizard: boolean = false, visualizationConfig?: VisualizationConfig, cache: VisualizationConfig[] = [], wizardConfig?: VisualizationConfig): string {
	const isVertical = treeOrientation === 'vertical';
	
	// If showing wizard, return wizard HTML
	if (showWizard) {
		return getWizardHtml(webview, cache, wizardConfig);
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
		.header-left {
			display: flex;
			align-items: center;
			flex: 0 0 auto;
			gap: 10px;
		}
		.header-right {
			display: flex;
			align-items: center;
			gap: 10px;
			flex: 0 0 auto;
		}
		.header-center {
			flex: 1;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.title {
			font-size: 18px;
			font-weight: bold;
		}
		.header-separator {
			width: 2px;
			height: 24px;
			background-color: var(--vscode-panel-border);
			margin: 0 10px;
		}
		.variable-input-group {
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.bottom-controls {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 10px;
			margin-top: 20px;
			padding-top: 15px;
			border-top: 2px solid var(--vscode-panel-border);
			flex-shrink: 0;
		}
		.size-refresh-group {
			display: flex;
			align-items: center;
			gap: 8px;
			justify-content: center;
		}
		.refresh-button-container {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.debug-buttons-group {
			display: flex;
			gap: 5px;
			flex-wrap: wrap;
			justify-content: center;
		}
		.debug-buttons-group button {
			padding: 8px 16px;
			font-size: 16px;
		}
		.size-display-button {
			padding: 4px 12px;
			background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
			color: var(--vscode-button-foreground);
			border: 1px solid var(--vscode-button-border);
			border-radius: 4px;
			font-size: 13px;
			font-weight: 600;
			box-shadow: 0 2px 4px rgba(0,0,0,0.2);
			height: fit-content;
			display: inline-flex;
			align-items: center;
		}
		.refresh-button {
			padding: 4px 12px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: 1px solid var(--vscode-button-border);
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
		}
		.refresh-button:hover {
			background-color: var(--vscode-button-hoverBackground);
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
		button {
			padding: 4px 12px;
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
		<div class="header-left">
			<button id="change-variable-btn">Back</button>
			<div class="header-separator"></div>
		</div>
		<div class="header-center">
			<div class="title">Data Structure Visualizer: <code>${variableName ? escapeHtml(variableName) : ''}</code></div>
		</div>
		<div class="header-right">
			<div class="header-separator"></div>
			<button id="add-visualization-btn">Add Another Visualization</button>
		</div>
	</div>
	
	<div id="tree-container"></div>
	
	${showDebugControls ? `
	<div class="bottom-controls">
		<div class="size-refresh-group">
			<div id="size-container" style="display: none;">
				<span id="size-display" class="size-display-button"></span>
			</div>
			<div class="refresh-button-container">
				<button id="refresh-visualization-btn" class="refresh-button" title="Refresh Visualization">refresh</button>
			</div>
		</div>
		<div class="debug-buttons-group">
			<button id="step-over">⤵ Step Over</button>
			<button id="step-into">→ Step Into</button>
			<button id="step-out">↑ Step Out</button>
			<button id="continue">▶ Continue</button>
		</div>
	</div>
	` : ''}
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

			// Back button handler - opens wizard at step 3 with current config
			const changeVariableBtn = document.getElementById('change-variable-btn');
			if (changeVariableBtn) {
				changeVariableBtn.addEventListener('click', () => {
					// Send current config to open wizard at step 3
					vscode.postMessage({ command: 'openWizardWithConfig' });
				});
			}

			// Refresh visualization button handler
			const refreshBtn = document.getElementById('refresh-visualization-btn');
			if (refreshBtn) {
				refreshBtn.addEventListener('click', () => {
					vscode.postMessage({ command: 'refresh' });
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
					const sizeContainer = document.getElementById('size-container');
					const sizeDisplay = document.getElementById('size-display');
					if (sizeDisplay) {
						sizeDisplay.textContent = 'CurrentSize: ' + message.size;
					}
					if (sizeContainer) {
						sizeContainer.style.display = 'inline-block';
					}
					break;
				case 'updateVariableName':
					// No longer needed since we removed the input field
					break;
			}
		});

		async function updateSizeDisplay(config) {
			const sizeContainer = document.getElementById('size-container');
			const sizeDisplay = document.getElementById('size-display');
			if (!sizeDisplay || !sizeContainer) return;

			if (!config.sizePath || config.sizePath.trim() === '') {
				sizeContainer.style.display = 'none';
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

			// Store original positions for dragging
			root.descendants().forEach(d => {
				d.x0 = d.x;
				d.y0 = d.y;
			});

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
				.on('click', (event, d) => showNodeInfo(d.data))
				.call(d3.drag()
					.on('start', dragStarted)
					.on('drag', dragged)
					.on('end', dragEnded));

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

		// Drag functions for nodes
		function dragStarted(event, d) {
			// Get current position (either fixed or original)
			let currentX, currentY;
			if (isVertical) {
				currentX = (d.fx !== undefined && d.fx !== null) ? d.fx : d.x;
				currentY = (d.fy !== undefined && d.fy !== null) ? d.fy : d.y;
			} else {
				currentX = (d.fy !== undefined && d.fy !== null) ? d.fy : d.y;
				currentY = (d.fx !== undefined && d.fx !== null) ? d.fx : d.x;
			}
			
			// Store the offset between mouse position and node position
			d.dragOffsetX = event.x - currentX;
			d.dragOffsetY = event.y - currentY;
			
			// Ensure fx and fy are set
			if (isVertical) {
				if (d.fx === undefined || d.fx === null) {
					d.fx = d.x;
				}
				if (d.fy === undefined || d.fy === null) {
					d.fy = d.y;
				}
			} else {
				if (d.fx === undefined || d.fx === null) {
					d.fx = d.y;
				}
				if (d.fy === undefined || d.fy === null) {
					d.fy = d.x;
				}
			}
		}

		function dragged(event, d) {
			// Calculate new position using the offset
			if (isVertical) {
				d.fx = event.x - d.dragOffsetX;
				d.fy = event.y - d.dragOffsetY;
			} else {
				d.fx = event.y - d.dragOffsetY;
				d.fy = event.x - d.dragOffsetX;
			}
			updateNodePosition(d);
		}

		function dragEnded(event, d) {
			// Keep the node at the dragged position
			// To reset, uncomment: d.fx = null; d.fy = null;
		}

		function updateNodePosition(d) {
			// Update the node's transform
			const nodeSelection = d3.selectAll('.node').filter(function() {
				return d3.select(this).datum() === d;
			});
			
			nodeSelection.attr('transform', isVertical 
				? 'translate(' + d.fx + ',' + d.fy + ')' 
				: 'translate(' + d.fy + ',' + d.fx + ')');
			
			// Create link generator with proper accessors
			const linkGenerator = isVertical 
				? d3.linkVertical().x(d => d.x).y(d => d.y)
				: d3.linkHorizontal().x(d => d.y).y(d => d.x);
			
			// Update all links
			g.selectAll('.link')
				.attr('d', function(linkData) {
					const source = linkData.source;
					const target = linkData.target;
					
					// Get positions - use fixed position if available, otherwise use original
					let sourceX, sourceY, targetX, targetY;
					
					if (isVertical) {
						sourceX = (source.fx !== undefined && source.fx !== null) ? source.fx : source.x;
						sourceY = (source.fy !== undefined && source.fy !== null) ? source.fy : source.y;
						targetX = (target.fx !== undefined && target.fx !== null) ? target.fx : target.x;
						targetY = (target.fy !== undefined && target.fy !== null) ? target.fy : target.y;
					} else {
						sourceX = (source.fy !== undefined && source.fy !== null) ? source.fy : source.y;
						sourceY = (source.fx !== undefined && source.fx !== null) ? source.fx : source.x;
						targetX = (target.fy !== undefined && target.fy !== null) ? target.fy : target.y;
						targetY = (target.fx !== undefined && target.fx !== null) ? target.fx : target.x;
					}
					
					// Create source and target objects with x and y properties that linkGenerator expects
					const sourcePoint = { x: sourceX, y: sourceY };
					const targetPoint = { x: targetX, y: targetY };
					
					// Generate path using the link generator
					return linkGenerator({
						source: sourcePoint,
						target: targetPoint
					});
				});
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

