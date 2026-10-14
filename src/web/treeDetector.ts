// ============================================================================
// TREE DETECTION
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { getCurrentFrameId, getVariableChildren } from './debugAdapter';

export interface DetectedTree {
	path: string; // Expression of the tree root node (e.g., "root", "bst.root", "this.root")
	scope: string;
	config: VisualizationConfig;
	empty?: boolean; // Tree field is null/None for now: paths are detected once nodes exist
}

// Left/right attribute names, compared case-insensitively
const CHILD_NAME_PAIRS: [string, string][] = [
	['left', 'right'],
	['leftchild', 'rightchild'],
	['leftnode', 'rightnode'],
	['lchild', 'rchild'],
	['_left', '_right']
];
const KEY_NAMES = ['key', '_key'];
const VALUE_NAMES = ['val', 'value', 'data', 'element', 'elem', 'item', 'entry', 'info', '_val', '_value', '_data'];
const SIZE_NAMES = ['size', 'currentsize', '_size', 'count', 'length', 'numnodes', 'nodecount', 'num_nodes'];
const ROOT_NAMES = ['root', '_root'];
const NULL_VALUES = ['None', 'null', 'undefined', 'nil'];

// Limits so a large frame (e.g. Python globals) doesn't flood the debugger with requests
const MAX_REQUESTS = 80;
const MAX_VARIABLES_PER_SCOPE = 40;
const MAX_FIELDS_PER_OBJECT = 20;
const MAX_RESULTS = 10;

interface DapVariable {
	name: string;
	value?: string;
	variablesReference?: number;
}

export interface NodeShape {
	leftPath: string;
	rightPath: string;
	keyPath: string;
	valuePath: string;
}

/**
 * Finds binary trees in the current stack frame: variables that are tree nodes,
 * and objects (e.g. a BST class, `this`, `self`) holding a tree node in one of their fields
 */
export async function detectTrees(): Promise<DetectedTree[]> {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}

	const frameId = await getCurrentFrameId();
	if (frameId === undefined) {
		return [];
	}

	const scopesResponse = await debugSession.customRequest('scopes', { frameId });
	const scopes = scopesResponse?.scopes || scopesResponse?.body?.scopes || [];

	const budget = { remaining: MAX_REQUESTS };
	const found = new Map<string, DetectedTree>();

	for (const scope of scopes) {
		if (scope.expensive || budget.remaining <= 0) {
			continue;
		}
		const variables = (await fetchChildren(scope.variablesReference, budget))
			.filter(isExpandableField)
			.slice(0, MAX_VARIABLES_PER_SCOPE);

		for (const variable of variables) {
			await inspectVariable(variable, scope.name || 'Unknown', budget, found);
		}
	}

	return Array.from(found.values())
		.sort((a, b) => rank(a) - rank(b))
		.slice(0, MAX_RESULTS);
}

/**
 * Adds the variable if it is a tree node, or its fields that are tree nodes
 */
async function inspectVariable(
	variable: DapVariable,
	scope: string,
	budget: { remaining: number },
	found: Map<string, DetectedTree>
): Promise<void> {
	const fields = await fetchChildren(variable.variablesReference!, budget);
	const shape = await getNodeShape(fields, budget);

	if (shape) {
		addResult(found, variable.name, scope, {
			variablePath: variable.name,
			visualizationType: 'binaryTree',
			treePath: '',
			sizePath: '',
			...shape
		});
		return;
	}

	// Not a node itself: look one level down for a field holding the tree (e.g. bst.root)
	const sizeField = fields.find(f => !f.variablesReference && SIZE_NAMES.includes(f.name.toLowerCase()));

	// Empty tree (root is still null): offer it with empty paths, the builder detects them later
	const emptyRoot = fields.find(f => !f.variablesReference && ROOT_NAMES.includes(f.name.toLowerCase()) && NULL_VALUES.includes(String(f.value)));
	if (emptyRoot) {
		const treePath = `${variable.name}.${emptyRoot.name}`;
		addResult(found, treePath, scope, {
			variablePath: variable.name,
			visualizationType: 'binaryTree',
			treePath,
			sizePath: sizeField ? sizeField.name : '',
			leftPath: '',
			rightPath: '',
			keyPath: '',
			valuePath: ''
		}, true);
	}

	const candidates = fields.filter(isExpandableField).slice(0, MAX_FIELDS_PER_OBJECT);

	for (const field of candidates) {
		if (budget.remaining <= 0) {
			return;
		}
		const fieldShape = await getNodeShape(await fetchChildren(field.variablesReference!, budget), budget);
		if (fieldShape) {
			const treePath = `${variable.name}.${field.name}`;
			addResult(found, treePath, scope, {
				variablePath: variable.name,
				visualizationType: 'binaryTree',
				treePath,
				sizePath: sizeField ? sizeField.name : '',
				...fieldShape
			});
		}
	}
}

/**
 * Returns the attribute paths of a tree node, or null if the fields don't look like one
 */
export async function getNodeShape(fields: DapVariable[], budget: { remaining: number }): Promise<NodeShape | null> {
	const byLowerName = new Map(fields.map(f => [f.name.toLowerCase(), f]));

	const pair = CHILD_NAME_PAIRS.find(([left, right]) => byLowerName.has(left) && byLowerName.has(right));
	if (!pair) {
		return null;
	}

	const shape: NodeShape = {
		leftPath: byLowerName.get(pair[0])!.name,
		rightPath: byLowerName.get(pair[1])!.name,
		keyPath: '',
		valuePath: ''
	};

	const keyField = KEY_NAMES.map(n => byLowerName.get(n)).find(Boolean);
	if (keyField) {
		shape.keyPath = keyField.name;
	}

	const valueField = VALUE_NAMES.map(n => byLowerName.get(n)).find(Boolean);
	if (valueField) {
		shape.valuePath = valueField.name;

		// Entry objects (e.g. Java EntryClass with key/value) keep both inside the element
		if (!keyField && valueField.variablesReference && budget.remaining > 0) {
			const entryFields = await fetchChildren(valueField.variablesReference, budget);
			const entryNames = new Map(entryFields.map(f => [f.name.toLowerCase(), f.name]));
			const entryKey = KEY_NAMES.map(n => entryNames.get(n)).find(Boolean);
			const entryValue = ['value', 'val', '_value', '_val'].map(n => entryNames.get(n)).find(Boolean);
			if (entryKey && entryValue) {
				shape.keyPath = `${valueField.name}.${entryKey}`;
				shape.valuePath = `${valueField.name}.${entryValue}`;
			}
		}
	}

	return shape;
}

async function fetchChildren(variablesReference: number, budget: { remaining: number }): Promise<DapVariable[]> {
	if (budget.remaining <= 0) {
		return [];
	}
	budget.remaining--;
	try {
		return await getVariableChildren(variablesReference);
	} catch {
		return [];
	}
}

/**
 * Expandable field with a name usable in a dotted path
 * (skips debugger groupings like "special variables" and "[[Prototype]]")
 */
function isExpandableField(variable: DapVariable): boolean {
	return !!variable.variablesReference
		&& variable.variablesReference > 0
		&& /^[A-Za-z_$][\w$]*$/.test(variable.name)
		&& !variable.name.startsWith('__');
}

function addResult(found: Map<string, DetectedTree>, path: string, scope: string, config: VisualizationConfig, empty = false) {
	if (!found.has(path)) {
		found.set(path, empty ? { path, scope, config, empty } : { path, scope, config });
	}
}

/**
 * Lower is better: trees named root first, then trees inside an object, then other nodes
 */
function rank(tree: DetectedTree): number {
	const lastSegment = tree.path.split('.').pop()!.toLowerCase();
	if (lastSegment === 'root' || lastSegment === '_root') {
		return 0;
	}
	return tree.config.treePath ? 1 : 2;
}
