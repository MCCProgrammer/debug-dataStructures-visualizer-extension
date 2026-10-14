"""
Test program for Debug Data Structures Visualizer.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+Opt+V (Ctrl+Alt+V). See ../TESTING.md.
"""


# --- LeetCode-style node: val / left / right ---------------------------------
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val!r})"


# --- Textbook BST: entries with key/value, leftChild / rightChild, size -------
class Entry:
    def __init__(self, key, value):
        self.key = key
        self.value = value

    def __repr__(self):
        return f"Entry({self.key!r}, {self.value!r})"


class BSTNode:
    def __init__(self, element):
        self.element = element
        self.leftChild = None
        self.rightChild = None

    def __repr__(self):
        return f"BSTNode({self.element!r})"


class BinarySearchTree:
    def __init__(self):
        self.root = None
        self.currentSize = 0

    def insert(self, key, value):
        self.root = self._insert(self.root, key, value)

    def _insert(self, node, key, value):
        if node is None:
            self.currentSize += 1
            return BSTNode(Entry(key, value))
        if key < node.element.key:
            node.leftChild = self._insert(node.leftChild, key, value)
        elif key > node.element.key:
            node.rightChild = self._insert(node.rightChild, key, value)
        else:
            node.element.value = value
        return node

    def describe(self):
        summary = f"BST with {self.currentSize} entries"
        return summary  # BREAKPOINT 4: inside a method, detects self.root


# --- AVL tree: key / height / left / right, rebalances on insert --------------
class AVLNode:
    def __init__(self, key):
        self.key = key
        self.height = 1
        self.left = None
        self.right = None

    def __repr__(self):
        return f"AVLNode({self.key})"


class AVLTree:
    def __init__(self):
        self.root = None
        self.size = 0

    def insert(self, key):
        self.root = self._insert(self.root, key)
        self.size += 1

    def _insert(self, node, key):
        if node is None:
            return AVLNode(key)
        if key < node.key:
            node.left = self._insert(node.left, key)
        else:
            node.right = self._insert(node.right, key)
        return self._rebalance(node)

    @staticmethod
    def _height(node):
        return node.height if node else 0

    def _update(self, node):
        node.height = 1 + max(self._height(node.left), self._height(node.right))

    def _rotate_right(self, y):
        x = y.left
        y.left = x.right
        x.right = y
        self._update(y)
        self._update(x)
        return x

    def _rotate_left(self, x):
        y = x.right
        x.right = y.left
        y.left = x
        self._update(x)
        self._update(y)
        return y

    def _rebalance(self, node):
        self._update(node)
        balance = self._height(node.left) - self._height(node.right)
        if balance > 1:
            if self._height(node.left.left) < self._height(node.left.right):
                node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        if balance < -1:
            if self._height(node.right.right) < self._height(node.right.left):
                node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        return node


# --- Not a tree: must not appear in the detected list -------------------------
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age


def skewed_tree(depth):
    """Right-leaning chain, deeper than the default maxDepth (20)"""
    head = None
    for value in range(depth, 0, -1):
        head = TreeNode(value, None, head)
    return head


def main():
    # 1. Simple tree with single children (L / R labels) and long values (truncated in the circle)
    root = TreeNode(8,
                    TreeNode(4, TreeNode(2, TreeNode(1)), TreeNode(6, None, TreeNode(7))),
                    TreeNode(12, TreeNode(10), TreeNode("fourteen")))
    person = Person("Ada", 36)
    print("Simple tree ready")  # BREAKPOINT 1: detects root; person is not listed

    # 2. BST with entries: Step Over in the panel to watch it grow
    bst = BinarySearchTree()
    bst.insert(50, "fifty")  # BREAKPOINT 2: bst.root is still empty; Step Over in the panel to watch it grow
    bst.insert(30, "thirty")
    bst.insert(70, "seventy")
    bst.insert(20, "twenty")
    bst.insert(40, "forty")
    bst.insert(60, "sixty")
    bst.insert(80, "eighty")

    # 3. AVL tree: every Step Over inserts a key, some trigger rotations
    avl = AVLTree()
    avl.insert(10)  # BREAKPOINT 3: visualize avl.root, then Step Over
    avl.insert(20)
    avl.insert(30)  # rotation left
    avl.insert(40)
    avl.insert(50)  # rotation left
    avl.insert(25)  # double rotation (right-left)
    avl.insert(5)
    avl.insert(4)   # rotation right

    bst.describe()  # stops at BREAKPOINT 4, inside the method

    # 4. Deep tree (30 levels, default maxDepth is 20) and several trees in the same frame
    deep = skewed_tree(30)
    print("Deep tree ready")  # BREAKPOINT 5

    print("Done")


if __name__ == "__main__":
    main()
