# Change Log

All notable changes to the "Debug Data Structures Visualizer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2025-01-XX

### Added
- 🌳 **Binary Tree Visualization**: Interactive D3.js visualization of binary trees during debugging
- 🔍 **Debug Integration**: Seamless integration with VS Code's Debug Adapter Protocol (DAP)
- 🎯 **Variable Inspection**: Visualize any variable by providing its name (e.g., `root`, `tree.root`)
- 🖱️ **Interactive Nodes**: Click on any node to see its attributes and properties
- 🎮 **Debug Controls**: Control debug execution directly from the visualization panel
  - Step Over (⤵)
  - Step Into (→)
  - Step Out (↑)
  - Continue (▶)
  - Pause (⏸)
- 🔄 **Auto-Refresh**: Automatically updates visualization when debug state changes
- 🐍 **Python & Java Support**: Works with Python and Java debuggers
- ⚙️ **Configurable Settings**:
  - `autoRefresh`: Automatically refresh when debug state changes
  - `defaultAttributes`: Default attributes to display for nodes
  - `leftChildName`: Name of left child attribute (default: "left")
  - `rightChildName`: Name of right child attribute (default: "right")
  - `nodeValueAttribute`: Attribute to display as node value
  - `maxDepth`: Maximum depth to traverse (default: 20)
  - `showDebugControls`: Show debug control buttons
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl+Alt+V` / `Cmd+Opt+V`: Open Data Structure Visualizer
  - `Ctrl+Shift+R` / `Cmd+Shift+R`: Refresh Visualization

### Features
- Recursive tree traversal via DAP
- Automatic detection of null/None values
- Support for different attribute naming conventions
- Error handling and informative error messages
- Responsive visualization that adapts to container size
- Dark/light theme support using VS Code theme variables
