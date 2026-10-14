# Linked lists

A singly linked list (`next`) and a doubly linked list like a textbook `DoubleList` (`head`, `tail`, `currentSize`, nodes with `element` / `previous` / `next`).

![Linked lists](../../images/linked-list.gif)

## Files

- [`linked_list_demo.py`](linked_list_demo.py): Python version
- [`LinkedListDemo.java`](LinkedListDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `linked_list_demo.py` or `LinkedListDemo.java`.
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

### BREAKPOINT 1: singly linked list
- [ ] `numbers` is listed as "linked list · empty for now"; opening it shows "List is empty (head is null)".
- [ ] Every **Step Over** adds a box: `3 → 1 → 4 → 1 → 5`, with `head` on the first one.
- [ ] The last pointer has a slash (null).
- [ ] After `remove(4)`: `3 → 1 → 1 → 5`, and the size drops to 4.

### BREAKPOINT 2: doubly linked list
- [ ] Open `names` and press **Step Over**.
- [ ] Solid `next` arrows, dashed `previous` arrows, `head` and `tail` labels.
- [ ] `add_last` / `addLast` appends, `add_first` / `addFirst` prepends (`carla` becomes the head).
- [ ] After `remove_first` and `remove_last`: `ana ⇄ bruno`, and `CurrentSize` drops to 2.
- [ ] Clicking a box shows the element and its pointers.

### BREAKPOINT 3
- [ ] Both lists are listed.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
