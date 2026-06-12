# Change Log

All notable changes to the "Debug Data Structures Visualizer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
