# Examples

Programs to try **Debug Data Structures Visualizer** with every supported data structure. Each folder has a Python version, a Java version and a README with the steps and what you should see at each breakpoint.

| Folder | Structures |
|---|---|
| [01-binary-tree](01-binary-tree/) | Simple binary tree, BST with key/value entries, AVL tree with rotations |
| [02-linked-list](02-linked-list/) | Singly linked list, doubly linked list (`DoubleList`) |
| [03-stack](03-stack/) | Stack on a list (`StackInList`), stack in an array (`StackInArray`) |
| [04-queue](04-queue/) | Queue on a list (`QueueInList`), circular queue in an array (`QueueInArray`) |
| [05-heap](05-heap/) | Min-heap in an array (`MinHeap`) |
| [06-hash-table](06-hash-table/) | Hash table with separate chaining (`SepChainHashTable`) |
| [07-nary-tree-trie](07-nary-tree-trie/) | N-ary tree, trie |

The Java classes follow the names used in many data structures courses (`DoubleList`, `StackInArray`, `QueueInArray`, `MinHeap`, `SepChainHashTable`, `OrderedDoubleList`, `EntryClass`).

## Getting the examples

Download the repository ([ZIP](https://github.com/MCCProgrammer/debug-dataStructures-visualizer-extension/archive/refs/heads/main.zip)) or clone it:

```bash
git clone https://github.com/MCCProgrammer/debug-dataStructures-visualizer-extension.git
```

Then open the `examples` folder in VS Code (**File → Open Folder**). You need the **Python Debugger** extension for Python and the **Extension Pack for Java** for Java.

## In every folder

1. Set breakpoints on the lines marked `BREAKPOINT`.
2. Press F5 with **Python: current file** or **Java: current file** (from `examples/.vscode/launch.json`).
3. When the program stops: `Cmd+K Cmd+V` / `Ctrl+K Ctrl+V`, the **Visualize** button in the status bar, or right-click a variable in **Variables** → **Visualize Data Structure**.
4. Press **Step Over** in the panel to see each operation.
