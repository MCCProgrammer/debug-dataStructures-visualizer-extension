"""
N-ary tree and trie for Debug Data Structures Visualizer: an n-ary node keeps a list of
children; a trie node keeps a dict from letter to child and marks where words end.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
"""


class NaryNode:
    def __init__(self, val, children=None):
        self.val = val
        self.children = children or []

    def add(self, child):
        self.children.append(child)
        return child

    def __repr__(self):
        return f"NaryNode({self.val!r})"


class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for letter in word:
            node = node.children.setdefault(letter, TrieNode())
        node.is_word = True


def main():
    # 1. N-ary tree: an org chart built step by step
    company = NaryNode("CEO")
    cto = company.add(NaryNode("CTO"))  # BREAKPOINT 1
    cto.add(NaryNode("Dev 1"))
    cto.add(NaryNode("Dev 2"))
    cfo = company.add(NaryNode("CFO"))
    cfo.add(NaryNode("Accountant"))
    company.add(NaryNode("COO"))

    # 2. Trie: words that share a prefix share nodes
    words = Trie()
    words.insert("car")  # BREAKPOINT 2
    words.insert("cat")
    words.insert("cart")
    words.insert("dog")
    words.insert("do")

    print("Done")  # BREAKPOINT 3


if __name__ == "__main__":
    main()
