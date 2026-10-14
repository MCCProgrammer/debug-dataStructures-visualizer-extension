// ============================================================================
// STRUCTURE BUILDING: linked lists, arrays (stacks, queues, heaps), hash tables, n-ary trees
// ============================================================================
//
// Structures are read by following variablesReference handles (DAP "variables" requests)
// rather than by evaluating expressions, so the same code works for any debugger.

import * as vscode from 'vscode';
import { StructureItem, TreeData, TreeNode, VisualizationConfig } from './types';
import { evaluateVariable, getCurrentFrameId, getVariableChildren } from './debugAdapter';
import { cleanValue } from './utils';

export interface DapVariable {
	name: string;
	value?: string;
	type?: string;
	variablesReference?: number;
	indexedVariables?: number;
}

// Field names, compared case-insensitively
export const NEXT_NAMES = ['next', '_next', 'nxt', 'nextnode', 'next_node'];
export const PREV_NAMES = ['prev', 'previous', '_prev', '_previous', 'prevnode', 'prev_node'];
export const HEAD_NAMES = ['head', '_head', 'first', '_first', 'headnode'];
export const TAIL_NAMES = ['tail', '_tail', 'last', '_last', 'tailnode'];
export const CHILDREN_NAMES = ['children', '_children', 'kids', 'childs', 'subtrees', 'sons', 'childnodes', 'child_nodes'];
export const KEY_NAMES = ['key', '_key'];
export const VALUE_NAMES = ['val', 'value', 'data', 'element', 'elem', 'item', 'entry', 'info', '_val', '_value', '_data', '_element'];
// Other fields that label an n-ary node (org charts, tries storing their letter)
const NARY_LABEL_NAMES = ['name', 'label', 'letter', 'char', 'ch', 'character', 'symbol'];
const TERMINAL_NAMES = ['is_word', 'isword', 'is_end', 'isend', 'end', 'is_end_of_word', 'isendofword', 'terminal', 'isterminal', 'is_terminal', 'word'];
export const NULL_VALUES = ['None', 'null', 'undefined', 'nil'];

// Display limits
const MAX_LIST_ITEMS = 100;
const MAX_CELLS = 64;
const MAX_ALL_BUCKETS = 32;
const MAX_TREE_NODES = 200;

// Java lists boxed values in fields as `Integer@45`; the number is in their `value` field
const BOXED = /^(java\.lang\.)?(Integer|Long|Short|Byte|Double|Float|Character|Boolean)@\d+$/;

// ---------------------------------------------------------------- variable helpers

export function isNull(variable: DapVariable | undefined): boolean {
	return !variable || (!variable.variablesReference && NULL_VALUES.includes(String(variable.value)));
}

export function pick(fields: DapVariable[], names: string[]): DapVariable | undefined {
	for (const name of names) {
		const field = fields.find(f => f.name.toLowerCase() === name);
		if (field) {
			return field;
		}
	}
	return undefined;
}

/**
 * Array, Python list/tuple/deque, Java ArrayList and other indexed collections
 */
export function isArrayLike(variable: DapVariable): boolean {
	const type = String(variable.type || '');
	return !!variable.variablesReference && (
		(variable.indexedVariables || 0) > 0 ||
		// Not matched by name alone: user classes are often called List, LinkedList, ListNode...
		/\[\]$|^(list|tuple|deque)$|^(java\.util\.)?(ArrayList|Vector|ArrayDeque)(<.*>)?$/.test(type) ||
		(!type && /^\[.*\]$/.test(String(variable.value)))
	);
}

/**
 * Python dict and similar mappings (children of a trie node)
 */
export function isDictLike(variable: DapVariable): boolean {
	return !!variable.variablesReference && /^(dict|defaultdict|OrderedDict)$/.test(String(variable.type || ''));
}

/**
 * A `children` field holding a collection, even an empty one (Java shows an empty
 * ArrayList with nothing to expand)
 */
export function isChildrenCollection(variable: DapVariable | undefined): boolean {
	if (!variable) {
		return false;
	}
	return isArrayLike(variable) || isDictLike(variable)
		|| /\[\]$|^(list|dict|tuple|deque)$|(ArrayList|LinkedList|List|Vector|ArrayDeque|HashMap|TreeMap|LinkedHashMap|Map|Set)(<.*>)?$/.test(String(variable.type || ''));
}

export async function fields(variablesReference: number | undefined): Promise<DapVariable[]> {
	if (!variablesReference) {
		return [];
	}
	try {
		return await getVariableChildren(variablesReference);
	} catch {
		return [];
	}
}

/**
 * Real fields of an object, without debugger groupings ("special variables", "len()")
 */
function attributesOf(objectFields: DapVariable[]): Record<string, any> {
	const attributes: Record<string, any> = {};
	for (const field of objectFields) {
		if (!/\s|\(\)/.test(field.name) && field.name !== '') {
			attributes[field.name] = cleanValue(field.value);
		}
	}
	return attributes;
}

/**
 * Items of an array-like variable, at most `max` of them (Java arrays are paged)
 */
export async function indexedChildren(variable: DapVariable, max: number): Promise<{ items: DapVariable[]; length: number }> {
	const indexed = variable.indexedVariables || 0;
	let children: DapVariable[];
	if (indexed > max) {
		const session = vscode.debug.activeDebugSession!;
		const response = await session.customRequest('variables', { variablesReference: variable.variablesReference, filter: 'indexed', start: 0, count: max });
		children = response?.variables || response?.body?.variables || [];
	} else {
		children = await fields(variable.variablesReference);
	}
	const items = children
		.filter(c => /^\[?\d+\]?$/.test(c.name))
		.sort((a, b) => indexOf(a) - indexOf(b))
		.slice(0, max);
	const lengthField = children.find(c => c.name === 'len()');
	const length = indexed || (lengthField ? parseInt(String(lengthField.value), 10) : items.length);
	return { items, length };
}

function indexOf(variable: DapVariable): number {
	return parseInt(variable.name.replace(/[[\]]/g, ''), 10);
}

/**
 * Text of a scalar value (numbers, strings, Java boxed values)
 */
async function scalarText(variable: DapVariable): Promise<string> {
	if (variable.variablesReference && BOXED.test(String(variable.value))) {
		const inner = (await fields(variable.variablesReference)).find(f => f.name === 'value');
		if (inner) {
			return String(cleanValue(inner.value));
		}
	}
	return String(cleanValue(variable.value));
}

function isScalar(variable: DapVariable): boolean {
	const value = String(variable.value);
	return !variable.variablesReference || BOXED.test(value) || /^".*"$/s.test(value) || variable.type === 'String' || variable.type === 'str';
}

interface Described {
	text: string; // toString / repr / scalar value
	key?: string;
	val?: string;
	attributes: Record<string, any>;
}

/**
 * Reads an element: a scalar, an entry with key and value, or a Python (key, value) tuple
 */
export async function describe(variable: DapVariable, depth = 0): Promise<Described> {
	if (isScalar(variable)) {
		return { text: await scalarText(variable), attributes: {} };
	}
	const objectFields = await fields(variable.variablesReference);
	const attributes = attributesOf(objectFields);
	const text = String(cleanValue(variable.value));

	if (variable.type === 'tuple') {
		const parts = objectFields.filter(f => /^\d+$/.test(f.name));
		if (parts.length === 2) {
			return { text, key: await scalarText(parts[0]), val: await scalarText(parts[1]), attributes };
		}
		return { text, attributes };
	}

	const keyField = pick(objectFields, KEY_NAMES);
	const valueField = pick(objectFields, VALUE_NAMES);
	if (keyField || valueField) {
		const key = keyField ? await scalarText(keyField) : undefined;
		if (valueField && !keyField && !isScalar(valueField) && depth === 0) {
			// Element wrapping an entry (e.g. node.element = Entry(key, value))
			const inner = await describe(valueField, depth + 1);
			return { ...inner, attributes };
		}
		const val = valueField ? (isScalar(valueField) ? await scalarText(valueField) : String(cleanValue(valueField.value))) : undefined;
		// Show the read values instead of Java's `Integer@81` for boxed fields
		if (keyField && key !== undefined) { attributes[keyField.name] = key; }
		if (valueField && val !== undefined) { attributes[valueField.name] = val; }
		return { text, key, val, attributes };
	}
	return { text, attributes };
}

function entryLabel(described: Described): string {
	if (described.key !== undefined && described.val !== undefined) {
		return `${described.key}: ${described.val}`;
	}
	return described.key ?? described.val ?? described.text;
}

async function resolve(expression: string): Promise<DapVariable> {
	const frameId = await getCurrentFrameId();
	const result = await evaluateVariable(expression, frameId);
	return {
		name: expression,
		value: typeof result === 'object' ? result.result ?? result.value : String(result),
		type: result?.type,
		variablesReference: result?.variablesReference || 0,
		indexedVariables: result?.indexedVariables
	};
}

async function readIndex(expression: string): Promise<number | undefined> {
	try {
		const value = parseInt(await scalarText(await resolve(expression)), 10);
		return isNaN(value) ? undefined : value;
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------- linked lists

export interface ListShape {
	next: string;
	prev?: string;
}

export function getListShape(nodeFields: DapVariable[]): ListShape | null {
	const next = pick(nodeFields, NEXT_NAMES);
	if (!next) {
		return null;
	}
	const prev = pick(nodeFields, PREV_NAMES);
	return { next: next.name, prev: prev?.name };
}

async function walkList(start: DapVariable | undefined, nextName?: string, prevName?: string, labelOf = entryLabel) {
	const items: StructureItem[] = [];
	const seen = new Set<string>();
	let current = start;
	let doubly = !!prevName;

	while (current && !isNull(current) && items.length < MAX_LIST_ITEMS) {
		// Stop on cycles when the debugger shows object identities (Java "Node@71")
		const identity = /@\d+$/.exec(String(current.value))?.[0];
		if (identity) {
			if (seen.has(identity)) {
				break;
			}
			seen.add(identity);
		}

		const nodeFields = await fields(current.variablesReference);
		if (!nextName) {
			const shape = getListShape(nodeFields);
			if (!shape) {
				break;
			}
			nextName = shape.next;
			prevName = shape.prev;
			doubly = !!prevName;
		}
		const valueField = pick(nodeFields.filter(f => f.name !== nextName && f.name !== prevName), [...VALUE_NAMES, ...KEY_NAMES]);
		const described = valueField ? await describe(valueField) : { text: String(cleanValue(current.value)), attributes: {} } as Described;
		items.push({
			id: `item_${items.length}`,
			label: labelOf(described),
			key: described.key,
			val: described.val ?? (described.key === undefined ? described.text : undefined),
			attributes: attributesOf(nodeFields)
		});
		current = nodeFields.find(f => f.name === nextName);
	}
	return { items, doubly, truncated: !!current && !isNull(current) };
}

async function readLinkedList(config: VisualizationConfig): Promise<TreeData> {
	const head = await resolve(config.treePath || config.variablePath);
	const list = await walkList(head, config.nextPath || undefined, config.prevPath || undefined);
	return {
		kind: 'linkedList',
		root: null,
		items: list.items,
		doubly: list.doubly,
		truncated: list.truncated,
		headLabel: config.headLabel || 'head',
		tailLabel: config.tailLabel
	};
}

// ---------------------------------------------------------------- arrays, stacks, queues, heaps

async function readCells(array: DapVariable): Promise<{ cells: StructureItem[]; length: number }> {
	const { items, length } = await indexedChildren(array, MAX_CELLS);
	const cells: StructureItem[] = [];
	for (const item of items) {
		const index = indexOf(item);
		if (isNull(item)) {
			cells.push({ id: `cell_${index}`, index, label: '', empty: true, attributes: {} });
			continue;
		}
		const described = await describe(item);
		cells.push({
			id: `cell_${index}`,
			index,
			label: described.key ?? described.val ?? described.text,
			key: described.key,
			val: described.val ?? (described.key === undefined ? described.text : undefined),
			attributes: described.attributes
		});
	}
	return { cells, length };
}

async function readArray(config: VisualizationConfig): Promise<TreeData> {
	const array = await resolve(config.treePath || config.variablePath);
	if (isNull(array)) {
		return { root: null, error: `"${config.treePath}" is null.` };
	}
	const { cells, length } = await readCells(array);
	const markers: Record<string, number> = {};
	for (const [label, path] of Object.entries(config.markers || {})) {
		const index = await readIndex(`${config.variablePath}.${path}`);
		if (index !== undefined) {
			markers[label] = index;
		}
	}

	const isStack = config.visualizationType === 'stack';
	if (isStack && markers.top === undefined) {
		// Stacks kept in a plain list (Python): the top is the last element
		const last = [...cells].reverse().find(c => !c.empty);
		if (last) {
			markers.top = last.index!;
		}
	}

	if (config.visualizationType === 'queue' && markers.front === undefined && markers.rear === undefined) {
		// Queues kept in a plain list: front is the first element, rear the last
		const filled = cells.filter(c => !c.empty);
		if (filled.length) {
			markers.front = filled[0].index!;
			markers.rear = filled[filled.length - 1].index!;
		}
	}

	if (config.visualizationType === 'heap') {
		let size = config.sizePath ? await readIndex(`${config.variablePath}.${config.sizePath}`) : undefined;
		if (size === undefined) {
			const firstEmpty = cells.findIndex(c => c.empty);
			size = firstEmpty < 0 ? cells.length : firstEmpty;
		}
		return { kind: 'heap', root: null, items: cells.slice(0, size), capacity: length, hiddenCells: Math.max(0, length - cells.length) };
	}

	return {
		kind: 'array',
		root: null,
		items: cells,
		markers,
		vertical: isStack,
		capacity: length,
		hiddenCells: Math.max(0, length - cells.length)
	};
}

// ---------------------------------------------------------------- hash tables

async function readBucket(bucket: DapVariable): Promise<StructureItem[]> {
	if (isScalar(bucket)) {
		return [{ id: 'entry', label: await scalarText(bucket), attributes: {} }];
	}
	if (isArrayLike(bucket)) {
		// Python list of (key, value) tuples
		const { items } = await indexedChildren(bucket, MAX_LIST_ITEMS);
		const entries: StructureItem[] = [];
		for (const item of items) {
			const described = await describe(item);
			entries.push({ id: `entry_${entries.length}`, label: entryLabel(described), key: described.key, val: described.val, attributes: described.attributes });
		}
		return entries;
	}
	const bucketFields = await fields(bucket.variablesReference);
	const head = pick(bucketFields, HEAD_NAMES);
	if (head) {
		// Bucket is a list object (e.g. OrderedDoubleList with head / tail)
		return (await walkList(head)).items;
	}
	if (getListShape(bucketFields)) {
		// Bucket is the first node of a chain
		return (await walkList(bucket)).items;
	}
	const described = await describe(bucket);
	return [{ id: 'entry', label: entryLabel(described), key: described.key, val: described.val, attributes: described.attributes }];
}

async function readHashTable(config: VisualizationConfig): Promise<TreeData> {
	const table = await resolve(config.treePath || config.variablePath);
	if (isNull(table)) {
		return { root: null, error: `"${config.treePath}" is null.` };
	}
	const { items, length } = await indexedChildren(table, MAX_CELLS);
	const buckets: { index: number; items: StructureItem[] }[] = [];
	for (const item of items) {
		const entries = isNull(item) ? [] : await readBucket(item);
		entries.forEach((entry, i) => { entry.id = `bucket_${indexOf(item)}_${i}`; });
		buckets.push({ index: indexOf(item), items: entries });
	}
	// Large tables: show only the buckets that hold something
	const shown = length > MAX_ALL_BUCKETS ? buckets.filter(b => b.items.length > 0) : buckets;
	return { kind: 'hashTable', root: null, buckets: shown, capacity: length, hiddenCells: length - shown.length };
}

// ---------------------------------------------------------------- n-ary trees and tries

async function readNaryTree(config: VisualizationConfig): Promise<TreeData> {
	const maxDepth = vscode.workspace.getConfiguration('dataStructuresVisualizer').get<number>('maxDepth', 20);
	const root = await resolve(config.treePath || config.variablePath);
	let count = 0;

	async function build(variable: DapVariable, depth: number, edgeLabel?: string): Promise<TreeNode | null> {
		if (isNull(variable) || count >= MAX_TREE_NODES) {
			return null;
		}
		count++;
		const nodeFields = await fields(variable.variablesReference);
		const childrenField = (config.childrenPath && nodeFields.find(f => f.name === config.childrenPath)) || pick(nodeFields, CHILDREN_NAMES);
		const valueField = pick(nodeFields.filter(f => f !== childrenField), [...VALUE_NAMES, ...KEY_NAMES, ...NARY_LABEL_NAMES]);
		const described = valueField ? await describe(valueField) : undefined;
		const terminalField = pick(nodeFields, TERMINAL_NAMES);

		const node: TreeNode = {
			id: `nary_${count}`,
			value: described ? (described.key ?? described.val ?? described.text) : (edgeLabel ?? ''),
			attributes: attributesOf(nodeFields),
			edgeLabel,
			terminal: !!terminalField && /^(true|True)$/.test(String(terminalField.value)),
			children: []
		};

		if (childrenField && childrenField.variablesReference && depth < maxDepth) {
			if (isDictLike(childrenField)) {
				// Trie: dict keys label the links
				const entries = (await fields(childrenField.variablesReference)).filter(f => !/\s|\(\)/.test(f.name));
				for (const entry of entries) {
					const child = await build(entry, depth + 1, entry.name.replace(/^(['"])(.*)\1$/, '$2'));
					if (child) {
						node.children!.push(child);
					}
				}
			} else {
				const { items, length } = await indexedChildren(childrenField, 256);
				// Trie with an array of children per letter: index 0..25 is 'a'..'z', 128/256 is ASCII
				const firstCode = length === 26 ? 97 : (length === 128 || length === 256) ? 0 : undefined;
				for (const item of items) {
					const letter = firstCode !== undefined ? String.fromCharCode(firstCode + indexOf(item)) : undefined;
					const child = await build(item, depth + 1, letter);
					if (child) {
						node.children!.push(child);
					}
				}
			}
		}
		return node;
	}

	return { kind: 'naryTree', root: await build(root, 0) };
}

/**
 * Reads any structure other than binary trees (those keep their path-based builder)
 */
export async function buildStructure(config: VisualizationConfig): Promise<TreeData> {
	switch (config.visualizationType) {
		case 'linkedList':
			return readLinkedList(config);
		case 'stack':
		case 'queue':
		case 'array':
		case 'heap':
			return readArray(config);
		case 'hashTable':
			return readHashTable(config);
		case 'naryTree':
			return readNaryTree(config);
		default:
			return { root: null, error: `Visualization type "${config.visualizationType}" is not supported.` };
	}
}

/**
 * Whether the data has anything to draw (used to count successful visualizations)
 */
export function hasContent(data: TreeData): boolean {
	return !!data.root || (data.items?.some(item => !item.empty) ?? false) || (data.buckets?.some(b => b.items.length > 0) ?? false);
}
