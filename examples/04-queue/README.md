# Queues

A queue on top of a doubly linked list (like a textbook `QueueInList`) and a circular queue in an array (like `QueueInArray`, with `array`, `front`, `rear` and `currentSize`).

![Queues](../../images/queue.gif)

## Files

- [`queue_demo.py`](queue_demo.py): Python version
- [`QueueDemo.java`](QueueDemo.java): Java version

## Before you start

- Install **Debug Data Structures Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-dataStructures-visualizer-extension) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-dataStructures-visualizer-extension).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `queue_demo.py` or `QueueDemo.java`.
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

### BREAKPOINT 1: queue on a list
- [ ] `line` is listed as "queue (linked list)".
- [ ] The first box is labelled `front` and the last `rear`.
- [ ] `enqueue` adds at the end, `dequeue` removes from the front. At the end: `bruno → carla → diogo`.

### BREAKPOINT 2: circular queue in an array
- [ ] `queue` is listed as "circular queue (array) · front: front · rear: rear".
- [ ] At first the array of 6 is empty, with `front` at 0 and `rear` at 5.
- [ ] Every `enqueue` moves `rear`; every `dequeue` clears a cell and moves `front`.
- [ ] The last `enqueue("G")` wraps `rear` around to index 0: `G`, empty, `C`, `D`, `E`, `F`, with `front` at 2.

## If something doesn't show up

- The structure has to exist in the frame where the program stopped (a local variable, or a field of `self` / `this`).
- If it isn't listed, type the variable name under **Or enter a variable name**, press **Search** and keep **Detect automatically** in step 2.
- Java shows strings in double quotes (`"ana"`), Python in single quotes (`'ana'`).
