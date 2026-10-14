# Hash tables

A hash table with separate chaining. In Java it is like a textbook `SepChainHashTable` (an array `table` of `OrderedDoubleList` buckets with key/value entries in key order); in Python it is a list of buckets holding `(key, value)` pairs.

![Hash tables](../../images/hash-table.gif)

## Files

- [`hash_table_demo.py`](hash_table_demo.py): Python version
- [`HashTableDemo.java`](HashTableDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `hash_table_demo.py` or `HashTableDemo.java`.
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

### BREAKPOINT 1
- [ ] `ages` is listed as "hash table". Opening it shows 5 empty buckets, crossed out.
- [ ] Every `put` / `insert` adds a `key: value` entry to its bucket's chain.
- [ ] `rui` and `eva` land in the same bucket and are chained (in Java, in key order).
- [ ] Inserting `ana` again updates its value to 22 instead of adding a second entry.
- [ ] After removing `rui`, that bucket only holds `eva`. `CurrentSize` follows along.

### BREAKPOINT 2
- [ ] Final state: `bia: 27`, `eva: 19`, `ana: 22`, `ivo: 45`, with 2 empty buckets.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
