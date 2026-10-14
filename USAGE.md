# Debug Data Structures Visualizer: Usage Guide

The [README](README.md) has the full feature list and an animation for every data structure. This guide is the short version, step by step.

## 1. Stop where your structure exists

Set a breakpoint on a line where your data structure is in scope (a local variable, or a field of `self` / `this`) and start debugging with F5. Wait until the line is highlighted.

## 2. Open the visualizer

- `Cmd+K Cmd+V` (Mac) or `Ctrl+K Ctrl+V` (Windows/Linux)
- the **Visualize** button in the status bar
- the graph icon at the top right of the editor, or in the debug toolbar
- right-click in the editor → **Open Data Structure Visualizer**
- right-click a variable in the **Variables** view → **Visualize Data Structure**, to open that structure straight away
- the Command Palette: **Open Data Structure Visualizer**

## 3. Pick the structure

The wizard lists the data structures found in the current frame, with their kind (binary tree, linked list, stack, queue, heap, hash table, n-ary tree, trie). Click one to draw it.

Not listed? Type the variable name, press **Search**, and in step 2:

- keep **Detect automatically** for any structure, or
- choose **Binary Tree (set each path yourself)** to set the paths to the root, children, key, value and size of a binary tree, with **Check** to see what each path points to.

## 4. Step through your code

The panel redraws the structure every time the debugger stops. Use **Step Over**, **Step Into**, **Step Out** and **Continue** in the panel, or the usual debug toolbar and shortcuts.

- Click a node, box, cell or entry to see its fields.
- Drag tree nodes to make room.
- **Back** returns to the wizard; **Add Another Visualization** opens a second panel.

## Examples

The [`examples`](examples/) folder has a Python and a Java program for every supported structure, each with a README of what you should see at every breakpoint.

## Settings

| Setting | Default | Description |
|---|---|---|
| `dataStructuresVisualizer.maxDepth` | `20` | Maximum depth drawn for trees |
| `dataStructuresVisualizer.treeOrientation` | `horizontal` | `horizontal` or `vertical` |
| `dataStructuresVisualizer.showDebugControls` | `true` | Show the step buttons in the panel |
| `dataStructuresVisualizer.autoRefreshInterval` | `300` | Delay in milliseconds before redrawing after a stop |
