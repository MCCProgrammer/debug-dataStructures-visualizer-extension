# Stacks

A stack on top of a doubly linked list (like a textbook `StackInList`, which keeps a `DoubleList` in `list`), a stack in an array (like `StackInArray`, with `array` and `top`) and, in Python, a plain list named `stack`.

![Stacks](../../images/stack.gif)

## Files

- [`stack_demo.py`](stack_demo.py): Python version
- [`StackDemo.java`](StackDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `stack_demo.py` or `StackDemo.java`.
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

### BREAKPOINT 1: stack on a list
- [ ] `calls` is listed as "stack (linked list)", even though the list is inside `calls.list`.
- [ ] The first box is labelled `top`. Every `push` puts the new element in front.
- [ ] After 3 pushes and 1 pop: `insert → main`.

### BREAKPOINT 2: stack in an array
- [ ] `undo` is listed as "stack (array) · top: top".
- [ ] The array is drawn bottom-up (index 0 at the bottom), empty cells dashed.
- [ ] The `top` marker moves up on `push` and down on `pop`. At the end: `type`, `bold`, top at index 1.

### BREAKPOINT 3 (Python only): a list named `stack`
- [ ] `stack` is recognised by its name; the top is the last element.
- [ ] After 3 appends and 1 pop: `10`, `20`, top at index 1.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
