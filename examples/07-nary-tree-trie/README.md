# N-ary trees and tries

An **n-ary tree** is a tree where each node can have any number of children (here an org chart, with a `children` list). A **trie** is an n-ary tree of letters that stores words: words with the same beginning share the same path, and the nodes where a word ends are marked. In Python the trie keeps its children in a dict (letter → node); in Java in an array of 26 (`a` to `z`), and the extension reads the letter from the position.

![N-ary trees and tries](../../images/nary-tree.gif)

## Files

- [`nary_tree_trie_demo.py`](nary_tree_trie_demo.py): Python version
- [`NaryTreeTrieDemo.java`](NaryTreeTrieDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `nary_tree_trie_demo.py` or `NaryTreeTrieDemo.java`.
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

### BREAKPOINT 1: n-ary tree
- [ ] `company` is listed as "n-ary tree" and starts with `CEO` alone.
- [ ] Every **Step Over** adds a node: `CTO` with `Dev 1` and `Dev 2`, `CFO` with `Accountant`, and `COO`.
- [ ] `cto` and `cfo` are listed too (they are subtrees).

### BREAKPOINT 2: trie
- [ ] `words.root` is listed as "trie" and starts with the root alone (`·`).
- [ ] Every `insert` adds the missing letters: `car`, `cat` and `cart` share `c → a`.
- [ ] Nodes where a word ends have a white border (legend in the corner). After `do` and `dog`, both `o` and `g` have one.

### BREAKPOINT 3
- [ ] Both structures are complete.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
