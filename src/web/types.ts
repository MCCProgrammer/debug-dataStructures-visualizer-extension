// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TreeNode {
	id: string;
	value: string | number; // Display value (key if available, otherwise value or fallback)
	key?: string | number; // Node key (shown in visualization)
	val?: string | number; // Node value (shown in details)
	attributes: Record<string, any>;
	left?: TreeNode;
	right?: TreeNode;
	children?: TreeNode[];
	edgeLabel?: string; // Label of the link from the parent (e.g. a trie letter)
	terminal?: boolean; // Marks the end of a word in a trie
	x?: number;
	y?: number;
}

export type StructureKind = 'binaryTree' | 'naryTree' | 'linkedList' | 'array' | 'heap' | 'hashTable';

// One box of a list, one cell of an array, one entry of a hash table bucket
export interface StructureItem {
	id: string;
	label: string;
	key?: string;
	val?: string;
	attributes: Record<string, any>;
	index?: number; // Array index
	empty?: boolean; // Array cell holding null
}

export interface TreeData {
	kind?: StructureKind; // Missing means binaryTree
	root: TreeNode | null; // Binary and n-ary trees
	items?: StructureItem[]; // Linked list nodes, array cells, heap entries
	buckets?: { index: number; items: StructureItem[] }[]; // Hash table
	doubly?: boolean; // Linked list with previous pointers
	headLabel?: string; // Linked list: "head", or "top" / "front" for stacks and queues
	tailLabel?: string;
	markers?: Record<string, number>; // Array: index of top / front / rear
	vertical?: boolean; // Array drawn bottom-up (stacks)
	capacity?: number; // Array length or number of buckets
	hiddenCells?: number; // Cells or buckets not sent because the array is too large
	truncated?: boolean; // List longer than the display limit
	error?: string;
}

export interface VisualizationConfig {
	variablePath: string; // The full path to the root variable (e.g., "root", "tree.root", "obj.data.root")
	visualizationType: 'binaryTree' | 'naryTree' | 'linkedList' | 'stack' | 'queue' | 'array' | 'heap' | 'hashTable';
	label?: string; // Name shown in the panel title (defaults to treePath or variablePath)
	// Binary tree specific paths
	treePath?: string; // Path to the actual tree node (relative to variablePath, empty means use variablePath directly)
	sizePath?: string; // Path to size attribute (e.g., "size" or "root.size")
	leftPath?: string; // Path to left child (e.g., "left" or "root.left")
	rightPath?: string; // Path to right child (e.g., "right" or "root.right")
	keyPath?: string; // Path to node key (e.g., "key" or "root.key")
	valuePath?: string; // Path to node value (e.g., "val" or "root.val")
	// Other structures: treePath is the full path of the list head, the array or the n-ary root
	headPath?: string; // Path to head node
	nextPath?: string; // Next node attribute (e.g. "next")
	prevPath?: string; // Previous node attribute (e.g. "previous"), empty for singly linked lists
	childrenPath?: string; // N-ary tree children attribute (e.g. "children")
	markers?: Record<string, string>; // Array index fields relative to variablePath (e.g. { top: "top" })
	headLabel?: string; // Label of the first list node ("head", "top", "front")
	tailLabel?: string; // Label of the last list node, when the structure keeps a tail
	orientation?: 'horizontal' | 'vertical'; // Orientation for linked list
}

export interface VariableLocation {
	path: string; // Full path to the variable (e.g., "root", "tree.root", "obj.data.root")
	scope: string; // Scope name (e.g., "Local", "Global", "Module")
	variablesReference: number;
}

