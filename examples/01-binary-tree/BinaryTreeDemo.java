/**
 * Test program for Debug Data Structures Visualizer.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
public class BinaryTreeDemo {

    // --- LeetCode-style node: val / left / right ------------------------------
    static class TreeNode {
        Object val;
        TreeNode left;
        TreeNode right;

        TreeNode(Object val) { this.val = val; }

        TreeNode(Object val, TreeNode left, TreeNode right) {
            this.val = val;
            this.left = left;
            this.right = right;
        }

        @Override
        public String toString() { return "TreeNode(" + val + ")"; }
    }

    // --- Textbook BST: entries with key/value, leftChild / rightChild, size ----
    static class EntryClass<K, V> {
        K key;
        V value;

        EntryClass(K key, V value) {
            this.key = key;
            this.value = value;
        }

        @Override
        public String toString() { return "Entry(" + key + ", " + value + ")"; }
    }

    static class BSTNode<E> {
        E element;
        BSTNode<E> leftChild;
        BSTNode<E> rightChild;

        BSTNode(E element) { this.element = element; }

        @Override
        public String toString() { return "BSTNode(" + element + ")"; }
    }

    static class BinarySearchTree<K extends Comparable<K>, V> {
        BSTNode<EntryClass<K, V>> root;
        int currentSize;

        void insert(K key, V value) {
            root = insert(root, key, value);
        }

        private BSTNode<EntryClass<K, V>> insert(BSTNode<EntryClass<K, V>> node, K key, V value) {
            if (node == null) {
                currentSize++;
                return new BSTNode<>(new EntryClass<>(key, value));
            }
            int cmp = key.compareTo(node.element.key);
            if (cmp < 0) {
                node.leftChild = insert(node.leftChild, key, value);
            } else if (cmp > 0) {
                node.rightChild = insert(node.rightChild, key, value);
            } else {
                node.element.value = value;
            }
            return node;
        }

        String describe() {
            String summary = "BST with " + currentSize + " entries";
            return summary; // BREAKPOINT 4: inside a method, detects this.root
        }
    }

    // --- AVL tree: key / height / left / right, rebalances on insert ----------
    static class AVLNode {
        int key;
        int height = 1;
        AVLNode left;
        AVLNode right;

        AVLNode(int key) { this.key = key; }

        @Override
        public String toString() { return "AVLNode(" + key + ")"; }
    }

    static class AVLTree {
        AVLNode root;
        int size;

        void insert(int key) {
            root = insert(root, key);
            size++;
        }

        private AVLNode insert(AVLNode node, int key) {
            if (node == null) {
                return new AVLNode(key);
            }
            if (key < node.key) {
                node.left = insert(node.left, key);
            } else {
                node.right = insert(node.right, key);
            }
            return rebalance(node);
        }

        private static int height(AVLNode node) {
            return node == null ? 0 : node.height;
        }

        private static void update(AVLNode node) {
            node.height = 1 + Math.max(height(node.left), height(node.right));
        }

        private static AVLNode rotateRight(AVLNode y) {
            AVLNode x = y.left;
            y.left = x.right;
            x.right = y;
            update(y);
            update(x);
            return x;
        }

        private static AVLNode rotateLeft(AVLNode x) {
            AVLNode y = x.right;
            x.right = y.left;
            y.left = x;
            update(x);
            update(y);
            return y;
        }

        private static AVLNode rebalance(AVLNode node) {
            update(node);
            int balance = height(node.left) - height(node.right);
            if (balance > 1) {
                if (height(node.left.left) < height(node.left.right)) {
                    node.left = rotateLeft(node.left);
                }
                return rotateRight(node);
            }
            if (balance < -1) {
                if (height(node.right.right) < height(node.right.left)) {
                    node.right = rotateRight(node.right);
                }
                return rotateLeft(node);
            }
            return node;
        }
    }

    // --- Not a tree: must not appear in the detected list ---------------------
    static class Person {
        String name;
        int age;

        Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
    }

    /** Right-leaning chain, deeper than the default maxDepth (20) */
    static TreeNode skewedTree(int depth) {
        TreeNode head = null;
        for (int value = depth; value > 0; value--) {
            head = new TreeNode(value, null, head);
        }
        return head;
    }

    public static void main(String[] args) {
        // 1. Simple tree with single children (L / R labels) and long values (truncated in the circle)
        TreeNode root = new TreeNode(8,
                new TreeNode(4, new TreeNode(2, new TreeNode(1), null), new TreeNode(6, null, new TreeNode(7))),
                new TreeNode(12, new TreeNode(10), new TreeNode("fourteen")));
        Person person = new Person("Ada", 36);
        System.out.println("Simple tree ready"); // BREAKPOINT 1: detects root; person is not listed

        // 2. BST with entries: Step Over in the panel to watch it grow
        BinarySearchTree<Integer, String> bst = new BinarySearchTree<>();
        bst.insert(50, "fifty"); // BREAKPOINT 2: bst.root is still empty; Step Over in the panel to watch it grow
        bst.insert(30, "thirty");
        bst.insert(70, "seventy");
        bst.insert(20, "twenty");
        bst.insert(40, "forty");
        bst.insert(60, "sixty");
        bst.insert(80, "eighty");

        // 3. AVL tree: every Step Over inserts a key, some trigger rotations
        AVLTree avl = new AVLTree();
        avl.insert(10); // BREAKPOINT 3: visualize avl.root, then Step Over
        avl.insert(20);
        avl.insert(30); // rotation left
        avl.insert(40);
        avl.insert(50); // rotation left
        avl.insert(25); // double rotation (right-left)
        avl.insert(5);
        avl.insert(4);  // rotation right

        bst.describe(); // stops at BREAKPOINT 4, inside the method

        // 4. Deep tree (30 levels, default maxDepth is 20) and several trees in the same frame
        TreeNode deep = skewedTree(30);
        System.out.println("Deep tree ready"); // BREAKPOINT 5

        System.out.println("Done");
    }
}
