# Change Log

All notable changes to the "Debug Data Structures Visualizer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.0] - Unreleased

### Added
- 🔎 **Automatic tree detection**: the wizard lists the trees in the current frame (`root`, `bst.root`, `self.root`, `this.root`...) with their child, key, value and size paths already filled in. Click one to draw it, or **Edit** to adjust it first. Trees that are still empty are listed too, and their paths are detected once nodes are added.
- ⭐ A one-time, dismissible request for a rating after the visualizer has drawn a tree in 5 debug sessions.

### Changed
- D3.js 7.9.0 is bundled with the extension instead of loaded from a CDN, so the visualizer works offline and behind proxies.
- The visualizer panels now use a Content Security Policy.
- Nodes keep a fixed spacing and the tree is centered and scaled to fit the panel (down to 50%, then it scrolls), so nodes no longer overlap.
- Links between nodes are visible in dark themes.
- The panel title shows the tree path (e.g. `avl.root`).

### Fixed
- Clicking **Edit** on a previously visualized variable no longer jumps back to step 2.
- Auto-refresh now works when stepping from the debug toolbar or with keyboard shortcuts, and refreshes every open panel, not just the one whose button was clicked.
- **Refresh Visualization** (`Cmd+Shift+R` / `Ctrl+Shift+R`) uses the panel's configuration, so trees with custom child names such as `leftChild` / `rightChild` no longer break.
- Debugger groupings such as Python's "special variables" no longer appear in Node Details.
- Dragging a node in the horizontal layout no longer breaks the links between nodes, including after clicking another node.
- Java: trees are detected and their fields read even when the node class overrides `toString()` (the Java debugger wraps those fields one level deeper).
- Java: boxed values show as `8` instead of `Integer@24 "8"`, in the circles, Node Details and the **Check** results.
- Variables are read from the frame selected in the Call Stack view, or from the thread that stopped, instead of always the first thread.

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
