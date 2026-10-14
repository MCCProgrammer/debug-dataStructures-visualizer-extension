import java.util.ArrayList;
import java.util.List;

/**
 * N-ary tree and trie for Debug Data Structures Visualizer: an n-ary node keeps a list of
 * children; a trie node keeps an array of 26 children (one per letter, 'a' to 'z')
 * and marks where words end.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
public class NaryTreeTrieDemo {

    static class NaryTreeNode<E> {
        E element;
        List<NaryTreeNode<E>> children = new ArrayList<>();

        NaryTreeNode(E element) { this.element = element; }

        NaryTreeNode<E> add(NaryTreeNode<E> child) {
            children.add(child);
            return child;
        }

        @Override
        public String toString() { return "NaryTreeNode(" + element + ")"; }
    }

    static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEndOfWord;
    }

    static class Trie {
        TrieNode root = new TrieNode();

        void insert(String word) {
            TrieNode node = root;
            for (char letter : word.toCharArray()) {
                int index = letter - 'a';
                if (node.children[index] == null) {
                    node.children[index] = new TrieNode();
                }
                node = node.children[index];
            }
            node.isEndOfWord = true;
        }
    }

    public static void main(String[] args) {
        // 1. N-ary tree: an org chart built step by step
        NaryTreeNode<String> company = new NaryTreeNode<>("CEO");
        NaryTreeNode<String> cto = company.add(new NaryTreeNode<>("CTO")); // BREAKPOINT 1
        cto.add(new NaryTreeNode<>("Dev 1"));
        cto.add(new NaryTreeNode<>("Dev 2"));
        NaryTreeNode<String> cfo = company.add(new NaryTreeNode<>("CFO"));
        cfo.add(new NaryTreeNode<>("Accountant"));
        company.add(new NaryTreeNode<>("COO"));

        // 2. Trie: words that share a prefix share nodes
        Trie words = new Trie();
        words.insert("car"); // BREAKPOINT 2
        words.insert("cat");
        words.insert("cart");
        words.insert("dog");
        words.insert("do");

        System.out.println("Done"); // BREAKPOINT 3
    }
}
