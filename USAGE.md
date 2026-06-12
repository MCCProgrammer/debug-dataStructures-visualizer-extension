# Debug Data Structures Visualizer - Usage Guide

## 📖 Overview

The **Debug Data Structures Visualizer** extension provides an interactive visualization of binary trees during debugging. It seamlessly integrates with VS Code's Debug Adapter Protocol to visualize your data structures in real-time while debugging Python or Java code.

## 🚀 Getting Started

### Prerequisites

- Visual Studio Code 1.85.0 or higher
- An active debug session (Python or Java debugger)

### Installation

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
4. **Configure Visualization**: 
   - Select a variable from the list or search for one
   - Choose "Binary Tree" as the visualization type
   - Configure paths to tree structure (left, right, key, value attributes)
   - Click "Start Visualization"
5. **Visualize**: The tree will be displayed in an interactive panel

### Interactive Features

#### Node Interaction
- **Click Nodes**: Click on any node to see its attributes (value, key, height, balanceFactor, etc.)
- **Drag Nodes**: Drag nodes to reposition them for better visualization when nodes are too close together
- **Node Details Panel**: Shows all node attributes when you click on a node

#### Debug Controls
Use the debug buttons in the visualization panel:
- **Step Over** (⤵): Execute current line
- **Step Into** (→): Step into function calls
- **Step Out** (↑): Step out of current function
- **Continue** (▶): Continue execution
- **Pause** (⏸): Pause execution

#### Visualization Controls
- **Refresh**: Click the refresh button (🔄) to update the visualization with current state
- **Back**: Return to the configuration wizard to change variables or settings
- **Add Another Visualization**: Open a new visualization panel for a different variable

### Configuration Wizard

The extension uses a step-by-step wizard to configure visualizations:

#### Step 1: Variable Selection
- Search for variables in all scopes (Local, Global, Module)
- View previously visualized variables (cached configurations)
- Click on a cached configuration to reuse it immediately
- Click "Edit" on a cached configuration to modify it

#### Step 2: Visualization Type Selection
- **Binary Tree**: Currently supported
- **Doubly Linked List**: Coming soon

#### Step 3: Binary Tree Configuration
Configure paths to your tree structure:

- **Variable Path**: The root variable (e.g., `root`, `tree.root`, `myBST`)
- **Tree Path**: Path to the actual tree node (optional, defaults to variable path)
- **Size Path**: Path to size attribute (optional, e.g., `size` or `root.size`)
- **Left Path**: Path to left child (default: `left`)
- **Right Path**: Path to right child (default: `right`)
- **Key Path**: Path to node key attribute (optional)
- **Value Path**: Path to node value attribute (optional)

**Path Checking**: Use the "Check" button next to each path field to verify it exists in the debugger.

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

**Configuration for this example:**
- Variable Path: `root`
- Left Path: `left`
- Right Path: `right`
- Value Path: `val`

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

**Configuration for this example:**
- Variable Path: `root`
- Left Path: `left`
- Right Path: `right`
- Value Path: `val`

### Advanced Examples

#### Nested Tree Structure

```python
class Tree:
    def __init__(self):
        self.root = None
        self.size = 0

tree = Tree()
tree.root = TreeNode(1)
tree.root.left = TreeNode(2)

# Breakpoint here
print(tree.size)
```

**Configuration:**
- Variable Path: `tree`
- Tree Path: `root`
- Size Path: `size`
- Left Path: `root.left`
- Right Path: `root.right`
- Value Path: `root.val`

## ⚙️ Settings

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

### `dataStructuresVisualizer.treeOrientation`

Orientation of the tree visualization.

**Options**: `"horizontal"` (left to right) or `"vertical"` (top to bottom)

**Default**: `"horizontal"`

```json
{
  "dataStructuresVisualizer.treeOrientation": "vertical"
}
```

### `dataStructuresVisualizer.autoRefreshInterval`

Delay in milliseconds before refreshing after debug actions or debug state changes.

**Default**: `300`

```json
{
  "dataStructuresVisualizer.autoRefreshInterval": 500
}
```

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+V` / `Cmd+Opt+V` | Open Data Structure Visualizer (when debugger is stopped) |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Refresh Visualization (when visualizer is active) |

## 🔧 Troubleshooting

### "No active debug session" Error

Make sure you have started debugging before opening the visualizer. The extension requires an active debug session to access variables.

### Tree Not Displaying

- Verify the variable name is correct
- Check that the variable is in scope at the current breakpoint
- Ensure the variable has `left` and `right` attributes (or configured attribute names)
- Use the "Check" button to verify paths are correct
- Check the debug console for error messages

### Nodes Not Showing Attributes

- Verify the node has attributes accessible via the debugger
- Check that attribute names match your data structure (e.g., `val` vs `value`)
- Ensure the key/value paths are correctly configured

### Nodes Too Close Together

- Drag nodes to reposition them for better visualization
- Dragged positions are preserved until you refresh or restart the visualization

### Visualization Not Updating

- Click the "Refresh" button to manually update
- Check that auto-refresh is enabled in settings
- Verify the debug session is still active

## 📝 Future Features

- **Doubly Linked List**: Support for visualizing doubly linked lists (coming soon)
- Support for AVL trees with balance factor visualization
- Support for Red-Black trees with color visualization
- Support for graphs
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
