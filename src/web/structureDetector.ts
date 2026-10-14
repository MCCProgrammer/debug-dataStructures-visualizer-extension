// ============================================================================
// STRUCTURE DETECTION
// ============================================================================

import * as vscode from 'vscode';
import { VisualizationConfig } from './types';
import { getCurrentFrameId, getVariableChildren } from './debugAdapter';
import {
	CHILDREN_NAMES, DapVariable, HEAD_NAMES, KEY_NAMES, TAIL_NAMES, VALUE_NAMES,
	getListShape, isArrayLike, isChildrenCollection, isDictLike, isNull, pick
} from './structureBuilder';

export interface DetectedTree {
	path: string; // Expression of the structure (e.g., "root", "bst.root", "this.root", "queue")
	scope: string;
	config: VisualizationConfig;
	description: string; // Shown under the path in the wizard (kind and fields)
	empty?: boolean; // Structure is null/None for now: paths are detected once nodes exist
}

// Left/right attribute names, compared case-insensitively
const CHILD_NAME_PAIRS: [string, string][] = [
	['left', 'right'],
	['leftchild', 'rightchild'],
	['leftnode', 'rightnode'],
	['lchild', 'rchild'],
	['_left', '_right']
];
const SIZE_NAMES = ['size', 'currentsize', '_size', 'count', 'length', 'numnodes', 'nodecount', 'num_nodes', 'n'];
const ROOT_NAMES = ['root', '_root'];
const ARRAY_FIELD_NAMES = ['array', 'arr', 'elements', 'items', 'data', 'values', 'heap', 'table', 'buckets', 'bins', 'slots', 'stack', 'queue', 'entries', 'a',
	'_array', '_items', '_data', '_heap', '_table', '_buckets', '_elements'];
const BUCKET_FIELD_NAMES = ['table', 'buckets', 'bins', 'slots', '_table', '_buckets'];
const FRONT_NAMES = ['front', 'head', 'first', '_front', '_head'];
const REAR_NAMES = ['rear', 'tail', 'back', 'last', '_rear', '_tail'];

// Limits so a large frame (e.g. Python globals) doesn't flood the debugger with requests
const MAX_REQUESTS = 150;
const MAX_VARIABLES_PER_SCOPE = 40;
const MAX_FIELDS_PER_OBJECT = 20;
const MAX_RESULTS = 15;

export interface NodeShape {
	leftPath: string;
	rightPath: string;
	keyPath: string;
	valuePath: string;
}

interface Context {
	budget: { remaining: number };
	found: Map<string, DetectedTree>;
	scope: string;
}

/**
 * Finds data structures in the current stack frame: variables that are nodes (tree, list, n-ary),
 * and objects (e.g. a BST class, a stack, `this`, `self`) holding a structure in one of their fields
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
			await inspectVariable(variable.name, variable, '', 0, { budget, found, scope: scope.name || 'Unknown' });
		}
	}

	return Array.from(found.values())
		.sort((a, b) => rank(a) - rank(b))
		.slice(0, MAX_RESULTS);
}

/**
 * Detects the structure of one variable the user picked in the wizard
 */
export async function detectStructureAt(path: string, variable: DapVariable): Promise<DetectedTree | undefined> {
	const found = new Map<string, DetectedTree>();
	await inspectVariable(path, variable, '', 0, { budget: { remaining: MAX_REQUESTS }, found, scope: '' });
	return Array.from(found.values())[0];
}

/**
 * Adds the variable if it is a structure, otherwise looks at its fields (one level down).
 * `hint` carries the type of the enclosing object, e.g. a StackInList around a DoubleList.
 */
async function inspectVariable(path: string, variable: DapVariable, hint: string, depth: number, ctx: Context): Promise<boolean> {
	const context = `${variable.type || ''} ${variable.value || ''} ${hint}`;
	const name = path.split('.').pop()!.toLowerCase();

	// A plain list named like a structure (Python: heap = [], stack = [])
	if (isArrayLike(variable)) {
		const kind = /heap|priority/.test(name) ? 'heap' : /stack/.test(name) ? 'stack' : /queue/.test(name) ? 'queue' : undefined;
		if (kind) {
			add(ctx, path, { variablePath: path, visualizationType: kind, treePath: path, label: path }, describeKind(kind, {}));
			return true;
		}
		return false;
	}

	const objectFields = await fetchChildren(variable.variablesReference!, ctx.budget);

	// 1. The variable is a node
	const binary = await getNodeShape(objectFields, ctx.budget);
	if (binary) {
		add(ctx, path, { variablePath: path, visualizationType: 'binaryTree', treePath: '', sizePath: '', ...binary }, describeBinary(binary, ''));
		return true;
	}
	const children = pick(objectFields, CHILDREN_NAMES);
	if (children && isChildrenCollection(children)) {
		add(ctx, path, { variablePath: path, visualizationType: 'naryTree', treePath: path, childrenPath: children.name }, describeNary(children));
		return true;
	}
	const listShape = getListShape(objectFields);
	if (listShape) {
		add(ctx, path, { variablePath: path, visualizationType: 'linkedList', treePath: path, nextPath: listShape.next, prevPath: listShape.prev || '', headLabel: 'head' },
			listShape.prev ? 'doubly linked list · next / ' + listShape.prev : 'singly linked list · next');
		return true;
	}

	// 2. An object holding a structure
	const sizeField = objectFields.find(f => !f.variablesReference && SIZE_NAMES.includes(f.name.toLowerCase()));
	const sizePath = sizeField ? sizeField.name : '';
	const sizeText = sizeField ? ` · size: ${sizeField.name}` : '';
	const isStack = /stack/i.test(context);
	const isQueue = /queue/i.test(context);

	const root = pick(objectFields, ROOT_NAMES);
	if (root && (root.variablesReference || isNull(root))) {
		const treePath = `${path}.${root.name}`;
		if (isNull(root)) {
			// Empty tree: offer it with empty paths, the builder detects them once nodes exist
			add(ctx, treePath, { variablePath: path, visualizationType: 'binaryTree', treePath, sizePath, leftPath: '', rightPath: '', keyPath: '', valuePath: '', label: treePath },
				'empty for now' + sizeText, true);
			return true;
		}
		const rootFields = await fetchChildren(root.variablesReference!, ctx.budget);
		const rootShape = await getNodeShape(rootFields, ctx.budget);
		if (rootShape) {
			add(ctx, treePath, { variablePath: path, visualizationType: 'binaryTree', treePath, sizePath, ...rootShape, label: treePath }, describeBinary(rootShape, sizeText));
			return true;
		}
		const rootChildren = pick(rootFields, CHILDREN_NAMES);
		if (rootChildren && isChildrenCollection(rootChildren)) {
			add(ctx, treePath, { variablePath: path, visualizationType: 'naryTree', treePath, childrenPath: rootChildren.name, label: treePath }, describeNary(rootChildren));
			return true;
		}
	}

	const head = pick(objectFields, HEAD_NAMES);
	if (head && (head.variablesReference || isNull(head)) && !isArrayLike(head)) {
		const shape = isNull(head) ? null : getListShape(await fetchChildren(head.variablesReference!, ctx.budget));
		if (shape || isNull(head)) {
			const tail = pick(objectFields, TAIL_NAMES);
			const headLabel = isStack ? 'top' : isQueue ? 'front' : 'head';
			const tailLabel = tail && !isStack ? (isQueue ? 'rear' : 'tail') : undefined;
			const kind = isStack ? 'stack (linked list)' : isQueue ? 'queue (linked list)'
				: !shape ? 'linked list' : shape.prev ? 'doubly linked list' : 'singly linked list';
			// A list inside a stack or queue object is shown under the object's name (calls, not calls.list)
			const label = (isStack || isQueue) && depth > 0 ? path.split('.').slice(0, -1).join('.') : path;
			add(ctx, label, {
				variablePath: path, visualizationType: 'linkedList', treePath: `${path}.${head.name}`, sizePath,
				nextPath: shape?.next || '', prevPath: shape?.prev || '', headLabel, tailLabel, label
			}, kind + (isNull(head) ? ' · empty for now' : '') + sizeText, isNull(head));
			return true;
		}
	}

	const arrayField = objectFields.find(f => isArrayLike(f) && ARRAY_FIELD_NAMES.includes(f.name.toLowerCase()))
		|| (/stack|queue|heap|hash|priority/i.test(context) ? objectFields.find(isArrayLike) : undefined);
	if (arrayField) {
		const scalars = objectFields.filter(f => !f.variablesReference);
		const base = { variablePath: path, treePath: `${path}.${arrayField.name}`, sizePath, label: path };
		const fieldName = arrayField.name.toLowerCase();
		if (/hash|map|dict/i.test(context) || BUCKET_FIELD_NAMES.includes(fieldName)) {
			add(ctx, path, { ...base, visualizationType: 'hashTable' }, `hash table · buckets: ${arrayField.name}${sizeText}`);
			return true;
		}
		if (/heap|priority/i.test(context) || fieldName.includes('heap')) {
			add(ctx, path, { ...base, visualizationType: 'heap' }, `heap (array) · ${arrayField.name}${sizeText}`);
			return true;
		}
		const top = pick(scalars, ['top', '_top']);
		if (isStack || top) {
			add(ctx, path, { ...base, visualizationType: 'stack', markers: top ? { top: top.name } : {} }, describeKind('stack', { top: top?.name }) + sizeText);
			return true;
		}
		const front = pick(scalars, FRONT_NAMES);
		const rear = pick(scalars, REAR_NAMES);
		if (isQueue || (front && rear)) {
			const markers: Record<string, string> = {};
			if (front) { markers.front = front.name; }
			if (rear) { markers.rear = rear.name; }
			add(ctx, path, { ...base, visualizationType: 'queue', markers }, describeKind('queue', markers) + sizeText);
			return true;
		}
		if (sizeField) {
			add(ctx, path, { ...base, visualizationType: 'array' }, `array · ${arrayField.name}${sizeText}`);
			return true;
		}
	}

	// 3. Look one level down (e.g. StackInList.list, this.tree)
	if (depth === 0) {
		let added = false;
		for (const field of objectFields.filter(isExpandableField).slice(0, MAX_FIELDS_PER_OBJECT)) {
			if (ctx.budget.remaining <= 0) {
				break;
			}
			added = (await inspectVariable(`${path}.${field.name}`, field, context, 1, ctx)) || added;
		}
		return added;
	}
	return false;
}

/**
 * Returns the attribute paths of a binary tree node, or null if the fields don't look like one
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

function describeBinary(shape: NodeShape, sizeText: string): string {
	const parts = [`binary tree · children: ${shape.leftPath} / ${shape.rightPath}`];
	if (shape.keyPath) { parts.push(`key: ${shape.keyPath}`); }
	if (shape.valuePath) { parts.push(`value: ${shape.valuePath}`); }
	return parts.join(' · ') + sizeText;
}

function describeNary(children: DapVariable): string {
	if (isDictLike(children)) {
		return `trie · children by key: ${children.name}`;
	}
	if ([26, 128, 256].includes(children.indexedVariables || 0)) {
		return `trie · children by letter: ${children.name}`;
	}
	return `n-ary tree · children: ${children.name}`;
}

function describeKind(kind: string, markers: Record<string, string | undefined>): string {
	const marks = Object.entries(markers).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');
	const names: Record<string, string> = { heap: 'heap (list)', stack: 'stack (array)', queue: 'queue (array)' };
	if (kind === 'queue' && markers.front && markers.rear) {
		return 'circular queue (array) · ' + marks;
	}
	return names[kind] + (marks ? ' · ' + marks : '');
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
 * (skips debugger groupings like "special variables", "[[Prototype]]", and Java strings)
 */
function isExpandableField(variable: DapVariable): boolean {
	return !!variable.variablesReference
		&& variable.variablesReference > 0
		&& /^[A-Za-z_$][\w$]*$/.test(variable.name)
		&& !variable.name.startsWith('__')
		&& variable.type !== 'String'
		&& !/^".*"$/s.test(String(variable.value));
}

function add(ctx: Context, path: string, config: VisualizationConfig, description: string, empty = false) {
	const key = config.treePath || path;
	if (!ctx.found.has(key)) {
		ctx.found.set(key, { path, scope: ctx.scope, config, description, ...(empty ? { empty } : {}) });
	}
}

/**
 * Lower is better: trees named root first, then trees inside an object, then everything else
 */
function rank(tree: DetectedTree): number {
	const lastSegment = tree.path.split('.').pop()!.toLowerCase();
	if (lastSegment === 'root' || lastSegment === '_root') {
		return 0;
	}
	return tree.config.visualizationType === 'binaryTree' && tree.config.treePath ? 1 : 2;
}
