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
	x?: number;
	y?: number;
}

export interface TreeData {
	root: TreeNode | null;
	error?: string;
}

export interface VisualizationConfig {
	variablePath: string; // The full path to the root variable (e.g., "root", "tree.root", "obj.data.root")
	visualizationType: 'binaryTree' | 'doublyLinkedList';
	// Binary tree specific paths
	treePath?: string; // Path to the actual tree node (relative to variablePath, empty means use variablePath directly)
	sizePath?: string; // Path to size attribute (e.g., "size" or "root.size")
	leftPath?: string; // Path to left child (e.g., "left" or "root.left")
	rightPath?: string; // Path to right child (e.g., "right" or "root.right")
	keyPath?: string; // Path to node key (e.g., "key" or "root.key")
	valuePath?: string; // Path to node value (e.g., "val" or "root.val")
	// Doubly linked list specific paths (for future implementation)
	headPath?: string; // Path to head node
	nextPath?: string; // Path to next node attribute
	prevPath?: string; // Path to previous node attribute
	orientation?: 'horizontal' | 'vertical'; // Orientation for linked list
}

export interface VariableLocation {
	path: string; // Full path to the variable (e.g., "root", "tree.root", "obj.data.root")
	scope: string; // Scope name (e.g., "Local", "Global", "Module")
	variablesReference: number;
}

