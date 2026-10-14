# Change Log

All notable changes to the "Debug Data Structures Visualizer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.0.0] - 2026-10-14

A much bigger extension: it now draws the main data structures of a data structures course, finds them on its own, and works properly with Java.

### Added
- 🧱 **New data structures**, detected automatically and redrawn at every step:
  - **Linked lists**, singly and doubly linked, with head / tail and next / previous pointers
  - **Stacks and queues** built on a list (labelled top / front / rear) or in an array (drawn with top / front / rear markers, circular queues included)
  - **Heaps**, shown as their array and as the tree it encodes
  - **Hash tables** with separate chaining, each bucket with its chain
  - **N-ary trees and tries** (children in a list, an array or a dictionary; tries with an array of 26 children get their letters from the position)
- 🔎 **Automatic detection**: the wizard lists the data structures in the current frame (`root`, `bst.root`, `self.root`, `this.root`, `queue`...) ready to open with a click. Structures that are still empty are listed too and fill in as you step.
- Step 2 of the wizard can detect the structure of a variable you typed.
- More ways to open the panel: a **Visualize** button in the status bar while debugging, the graph icon in the editor title, the editor context menu, and **Visualize Data Structure** when right-clicking a variable in the Variables view (opens that structure directly).
- [`examples`](examples/) folder with a Python and a Java program per data structure, each with a README of what to expect at every breakpoint.
- ⭐ A one-time, dismissible request for a rating after the visualizer has drawn a structure in 5 debug sessions.

### Changed
- ⌨️ The shortcut is now `Cmd+K Cmd+V` / `Ctrl+K Ctrl+V` while debugging (`Cmd+Opt+V` clashed with system shortcuts on some Macs). Without a stopped debug session, the command explains what is missing instead of doing nothing.
- D3.js 7.9.0 is bundled with the extension instead of loaded from a CDN, so the visualizer works offline and behind proxies.
- The visualizer panels use a Content Security Policy.
- Nodes keep a fixed spacing and structures are centered and scaled to fit the panel (down to 50%, then it scrolls), so nodes no longer overlap.
- Links between nodes are visible in dark themes.
- The panel title shows the structure's path (e.g. `avl.root`).
- Java object references in Node Details drop their package and outer class (`DoubleListNode@49` instead of `StructuresDemo$DoubleListNode@49`), and long values wrap.

### Fixed
- 🔄 **Auto-refresh**: the panel now redraws after every step, from the panel, the debug toolbar or a shortcut, in every open panel, and also in a debug session that started before the panel was opened.
- ☕ **Java**: trees with nodes are detected and their fields read even when the node class overrides `toString()` (the Java debugger wraps those fields one level deeper), and boxed values show as `8` instead of `Integer@24 "8"`.
- Variables are read from the frame selected in the Call Stack view, or from the thread that stopped, instead of always the first thread.
- **Refresh Visualization** (`Cmd+Shift+R` / `Ctrl+Shift+R`) uses the panel's configuration, so trees with custom child names such as `leftChild` / `rightChild` no longer break.
- Dragging a node in the horizontal layout no longer breaks the links between nodes, including after clicking another node.
- Clicking **Edit** on a previously visualized variable no longer jumps back to step 2.
- Debugger groupings such as Python's "special variables" no longer appear in Node Details.

## [1.0.1]

### Changed
- English comments and messages throughout, and links to the VS Code Marketplace and Open VSX in the README.

## [1.0.0] - 2026-03-18

### Added
- 🌳 **Binary Tree Visualization**: Interactive D3.js visualization of binary trees during debugging
- 🔍 **Debug Integration**: Seamless integration with VS Code's Debug Adapter Protocol (DAP)
- 🎯 **Variable Inspection**: Visualize any variable by providing its name (e.g., `root`, `tree.root`)
- 🖱️ **Interactive Nodes**: Click on any node to see its attributes and properties
- 🖱️ **Draggable Nodes**: Drag nodes to reposition them for better visualization when nodes are too close together
- 🎮 **Debug Controls**: Control debug execution directly from the visualization panel
  - Step Over (⤵)
  - Step Into (→)
  - Step Out (↑)
  - Continue (▶)
  - Pause (⏸)
- 🔄 **Auto-Refresh**: Automatically updates visualization when debug state changes
- 🐍 **Python & Java Support**: Works with Python and Java debuggers
- ⚙️ **Configurable Settings**:
  - `maxDepth`: Maximum depth to traverse (default: 20)
  - `showDebugControls`: Show debug control buttons (default: true)
  - `treeOrientation`: Tree orientation - horizontal or vertical (default: horizontal)
  - `autoRefreshInterval`: Delay before auto-refresh in milliseconds (default: 300)
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl+Alt+V` / `Cmd+Opt+V`: Open Data Structure Visualizer
  - `Ctrl+Shift+R` / `Cmd+Shift+R`: Refresh Visualization
- 📋 **Configuration Wizard**: Step-by-step wizard for configuring visualizations
- 💾 **Configuration Caching**: Previously configured visualizations are cached for quick reuse

### Features
- Recursive tree traversal via DAP
- Automatic detection of null/None values
- Support for different attribute naming conventions
- Path validation with "Check" button for each configuration field
- Error handling and informative error messages
- Responsive visualization that adapts to container size
- Dark/light theme support using VS Code theme variables
- Multiple visualization panels support
- Horizontal and vertical tree orientations

### Coming Soon
- 🔗 **Doubly Linked List Visualization**: Support for visualizing doubly linked lists
