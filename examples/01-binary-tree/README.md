# Binary trees

A simple tree (`val` / `left` / `right`), a binary search tree with key/value entries (`element.key` / `element.value`, `leftChild` / `rightChild`, like a textbook `BSTNode`) and an AVL tree with rotations.

![Binary trees](../../images/demo.gif)

![Binary trees](../../images/bst.gif)

![Binary trees](../../images/manual.gif)

## Files

- [`binary_tree_demo.py`](binary_tree_demo.py): Python version
- [`BinaryTreeDemo.java`](BinaryTreeDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `binary_tree_demo.py` or `BinaryTreeDemo.java`.
2. Set a breakpoint on every line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops (line highlighted in yellow), open the visualizer in any of these ways:
   - `Cmd+K` then `Cmd+V` (Mac), or `Ctrl+K` then `Ctrl+V` (Windows/Linux)
   - the **Visualize** button in the status bar
   - the graph icon at the top right of the editor, or in the debug toolbar
   - right-click a variable in the **Variables** view → **Visualize Data Structure** (opens it directly)
5. Click the structure in **Data structures found in the current frame**.
6. Press **Step Over** in the panel (or F10) and watch the structure change at every line. **Continue** runs to the next breakpoint.

## What you should see

### BREAKPOINT 1: simple tree
- [ ] Only `root` is listed (`person` is not a data structure).
- [ ] The tree: 8 → (4, 12), with 2, 6, 10 and `fourteen` below.
- [ ] Single children are labelled **L** (1, under 2) or **R** (7, under 6).
- [ ] The long value is cut in the circle (`'four...`).
- [ ] Clicking a node shows its details; dragging a node takes its links along.

### BREAKPOINT 2: a growing BST
- [ ] `bst.root` is listed as "empty for now"; opening it shows "Tree is empty (null root)".
- [ ] Every **Step Over** adds a node (50, 30, 70, 20, 40, 60, 80). Keys come from `element.key`.
- [ ] `CurrentSize` goes up with each insert. A node's details show its Key and Value.

### BREAKPOINT 3: AVL rotations
- [ ] Open `avl.root` and press **Step Over** 8 times.
- [ ] Inserting 30 rotates the tree to `20(10, 30)`. At the end, 30 is the root with 20 and 40 below.

### BREAKPOINT 4: inside a method
- [ ] `self.root` (Python) or `this.root` (Java) is listed.

### BREAKPOINT 5: several trees
- [ ] `root`, `bst.root`, `avl.root` and `deep` are listed.
- [ ] `deep` has 30 levels but only 21 are drawn (setting `dataStructuresVisualizer.maxDepth`, 20 by default).
- [ ] To set the paths yourself: type `root`, **Search**, choose **Binary Tree (set each path yourself)** in step 2 and use **Check** on each field.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
