# Manual test checklist

Programs: [python/trees_demo.py](python/trees_demo.py) and [java/TreesDemo.java](java/TreesDemo.java). Both have the same scenarios and the same `BREAKPOINT 1`–`5` markers.

## Setup

1. Install the debuggers in VS Code: **Python Debugger** (`ms-python.debugpy`) and **Extension Pack for Java** (`vscjava.vscode-java-pack`).
2. In the extension repo, run **Run Web Extension (test programs)** (F5). It builds the extension and opens this folder in a new window.
3. In that window, set breakpoints on the five `BREAKPOINT` lines of the program you're testing.
4. Start **Python: trees_demo.py** or **Java: TreesDemo** from Run and Debug.

Java shows strings with double quotes and Python with single quotes. Everything else should look the same.

## Opening the visualizer

- [ ] Without a debug session, `Cmd+Opt+V` / `Ctrl+Alt+V` does nothing and the command palette entry shows "No active debug session".
- [ ] When stopped, it opens with `Cmd+Opt+V`, with the graph icon in the debug toolbar, and from the command palette ("Open Data Structure Visualizer").

## BREAKPOINT 1: simple tree

- [ ] The wizard shows "Looking for trees..." and then lists only `root`. `person` is not listed.
- [ ] Clicking `root` draws 8 → (4, 12), with 2, 6, 10 and `'fourteen'` below.
- [ ] Single children get labels: `1` shows **L** (under 2), `7` shows **R** (under 6).
- [ ] Long values are truncated in the circle (`'four...`).
- [ ] Clicking a node opens Node Details with its attributes. Clicking outside closes it.
- [ ] Nodes can be dragged and the links follow.
- [ ] The **refresh** button and `Cmd+Shift+R` / `Ctrl+Shift+R` redraw the tree.
- [ ] **Back** opens the wizard at step 3 with the paths filled in.
- [ ] Manual flow: **Back** → **Back** → **Back** to step 1, type `root`, **Search** → step 2 → **Next** → step 3. **Check** on each field shows the value or "Path not found". **Start Visualization** draws the tree.

## BREAKPOINT 2: empty BST that grows

- [ ] The detected list shows `bst.root` with "empty for now", plus `root`.
- [ ] Clicking `bst.root` shows "Tree is empty (null root)".
- [ ] **Step Over** in the panel adds one node per click: 50, then 30, 70, 20...
- [ ] Circles show the keys (`element.key`). Node Details shows Key and Value.
- [ ] The size badge shows `CurrentSize: n` and goes up with each insert.

## BREAKPOINT 3: AVL rotations

- [ ] `avl.root` is listed as "empty for now". Click it, then press **Step Over** 8 times.
- [ ] Expected shapes: `10` → `10(-,20)` → **`20(10,30)`** (rotation) → ... → `30(20(5(4,10),25),40(-,50))`.
- [ ] Node Details shows `height` updating.
- [ ] **Step Into** goes into `insert`, **Step Out** comes back, and the tree refreshes after each.
- [ ] **Continue** runs to BREAKPOINT 4 and the panel refreshes.

## BREAKPOINT 4: inside a method

- [ ] **Add Another Visualization** opens a new wizard listing `self.root` (Python) or `this.root` (Java), with size `currentSize`.

## BREAKPOINT 5: several trees, deep tree

- [ ] Four trees are listed: `avl.root`, `bst.root`, `root`, `deep`.
- [ ] Manual search for `root` offers a choice between `root`, `avl.root` and `bst.root`.
- [ ] `deep` draws 21 levels (1 to 21), cut by `maxDepth` (20). With `dataStructuresVisualizer.maxDepth` set to 40, all 30 levels appear.
- [ ] Two panels open side by side both refresh on each step.

## Wizard cache

- [ ] Step 1 lists "Previously Visualized Variables". Clicking one draws it right away.
- [ ] **Edit** on a cached item opens step 3 with its paths and stays on step 3.
- [ ] **Edit** on a detected tree does the same.

## Settings

- [ ] `dataStructuresVisualizer.treeOrientation: "vertical"` draws top to bottom (reopen the panel).
- [ ] `dataStructuresVisualizer.showDebugControls: false` hides the step buttons and the size badge.
- [ ] `dataStructuresVisualizer.autoRefreshInterval: 1500` delays the refresh after a step.

## Offline

- [ ] With Wi-Fi off, the tree still draws (D3 ships with the extension).

## Rating prompt

- [ ] After the tree has been drawn in 5 different debug sessions, a notification asks for a rating once.
- [ ] **Rate it** opens the Marketplace review page in VS Code, or Open VSX in Cursor or VSCodium.
- [ ] It never appears again, whatever the answer. The flag is stored in the VS Code profile and synced with Settings Sync, so test it in a profile that hasn't seen it.
