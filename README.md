# Debug Data Structures Visualizer

A Visual Studio Code extension that provides an interactive visualization of binary trees and other data structures during debugging. Perfect for visualizing binary trees, AVL trees, and other tree-based data structures while debugging Python or Java code.

## ✨ Features

- 🌳 **Binary Tree Visualization**: Interactive D3.js visualization of binary trees during debugging
- 🔍 **Debug Integration**: Seamlessly integrates with VS Code's Debug Adapter Protocol (DAP)
- 🎯 **Variable Inspection**: Simply provide the variable name (e.g., `root`, `tree.root`) to visualize
- 🖱️ **Interactive Nodes**: Click on any node to see its attributes and properties
- 🎮 **Debug Controls**: Control debug execution directly from the visualization panel
- 🔄 **Auto-Refresh**: Automatically updates when debug state changes
- 🐍 **Python & Java Support**: Works with Python and Java debuggers
- ⚙️ **Configurable**: Customize attribute names, depth limits, and more

## 🚀 Installation

1. Open VS Code
2. Go to Extensions section (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Debug Data Structures Visualizer"
4. Click "Install"

## 📖 How to Use

### Basic Usage

1. **Start Debugging**: Start debugging your Python or Java program
2. **Set a Breakpoint**: Set a breakpoint where your tree structure is available
3. **Open Visualizer**: 
   - Press `Ctrl+Alt+V` (Windows/Linux) or `Cmd+Opt+V` (Mac) when debugger is stopped
   - Or use Command Palette (`F1`) and search for "Open Data Structure Visualizer"
4. **Enter Variable Name**: When prompted, enter the variable name containing your tree root (e.g., `root`, `tree.root`, `myBST`)
5. **Visualize**: The tree will be displayed in an interactive panel

### Interactive Features

- **Click Nodes**: Click on any node to see its attributes (value, key, height, balanceFactor, etc.)
- **Debug Controls**: Use the debug buttons in the visualization panel:
  - **Step Over** (⤵): Execute current line
  - **Step Into** (→): Step into function calls
  - **Step Out** (↑): Step out of current function
  - **Continue** (▶): Continue execution
  - **Pause** (⏸): Pause execution
- **Refresh**: Click the refresh button (🔄) to update the visualization with current state

### Example Python Code

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# Create a binary tree
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)

# Set a breakpoint here and visualize 'root'
print(root.val)  # Breakpoint here
```

### Example Java Code

```java
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    
    TreeNode(int val) {
        this.val = val;
    }
}

// Create a binary tree
TreeNode root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);

// Set a breakpoint here and visualize 'root'
System.out.println(root.val);  // Breakpoint here
```

## ⚙️ Settings

The extension supports the following settings:

### `dataStructuresVisualizer.autoRefresh`

Automatically refresh visualization when debug state changes.

**Default**: `true`

```json
{
  "dataStructuresVisualizer.autoRefresh": true
}
```

### `dataStructuresVisualizer.defaultAttributes`

Default attributes to display for tree nodes.

**Default**: `["value", "key", "data"]`

```json
{
  "dataStructuresVisualizer.defaultAttributes": ["value", "key", "data", "height"]
}
```

### `dataStructuresVisualizer.leftChildName`

Name of the left child attribute in binary trees.

**Default**: `"left"`

```json
{
  "dataStructuresVisualizer.leftChildName": "left"
}
```

### `dataStructuresVisualizer.rightChildName`

Name of the right child attribute in binary trees.

**Default**: `"right"`

```json
{
  "dataStructuresVisualizer.rightChildName": "right"
}
```

### `dataStructuresVisualizer.nodeValueAttribute`

Name of the attribute to display as node value (fallback: key, data, val).

**Default**: `"value"`

```json
{
  "dataStructuresVisualizer.nodeValueAttribute": "val"
}
```

### `dataStructuresVisualizer.maxDepth`

Maximum depth to traverse when building tree structure.

**Default**: `20`

```json
{
  "dataStructuresVisualizer.maxDepth": 30
}
```

### `dataStructuresVisualizer.showDebugControls`

Show debug control buttons (Step Over, Step Into, etc.) in the visualization.

**Default**: `true`

```json
{
  "dataStructuresVisualizer.showDebugControls": true
}
```

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+V` / `Cmd+Opt+V` | Open Data Structure Visualizer (when debugger is stopped) |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Refresh Visualization (when visualizer is active) |

## 🔧 Requirements

- Visual Studio Code 1.85.0 or higher
- An active debug session (Python or Java)

## 🐛 Troubleshooting

### "No active debug session" Error

Make sure you have started debugging before opening the visualizer. The extension requires an active debug session to access variables.

### Tree Not Displaying

- Verify the variable name is correct
- Check that the variable is in scope at the current breakpoint
- Ensure the variable has `left` and `right` attributes (or configured attribute names)
- Check the debug console for error messages

### Nodes Not Showing Attributes

- Verify the node has attributes accessible via the debugger
- Check that attribute names match your data structure (e.g., `val` vs `value`)

## 📝 Future Features

- Support for AVL trees with balance factor visualization
- Support for Red-Black trees with color visualization
- Support for graphs
- Support for linked lists
- Support for tries
- Export tree as image (PNG/SVG)
- Export tree structure as JSON
- Simulation mode (visualize without debugging)

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request in the repository.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [D3.js](https://d3js.org/) for the powerful visualization library
- VS Code Debug Adapter Protocol for debug integration

---

**Enjoy visualizing your data structures during debugging!** 🎉
