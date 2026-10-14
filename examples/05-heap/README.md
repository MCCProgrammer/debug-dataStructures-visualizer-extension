# Heaps

A binary min-heap stored in an array: the children of index `i` are at `2i+1` and `2i+2`. In Java it is like a textbook `MinHeap` (an array of `EntryClass` plus `currentSize`); in Python it is a list.

![Heaps](../../images/heap.gif)

## Files

- [`heap_demo.py`](heap_demo.py): Python version
- [`HeapDemo.java`](HeapDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `heap_demo.py` or `HeapDemo.java`.
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
- [ ] `heap` is listed as "heap (array)"; opening it shows "Heap is empty".
- [ ] Every **Step Over** shows the array on top and the tree it encodes below.
- [ ] Inserting 10 sifts it up to the root; inserting 5 makes it the new minimum.
- [ ] Clicking a node shows its index in the array (and, in Java, the entry's key and value).
- [ ] After two `remove_min` / `removeMin`: `20 30 40 50`.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
