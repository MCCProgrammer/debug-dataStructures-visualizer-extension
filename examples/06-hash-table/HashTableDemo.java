/**
 * Hash table with separate chaining for Debug Data Structures Visualizer, like the course's
 * SepChainHashTable: an array of OrderedDoubleList buckets holding key/value entries.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
@SuppressWarnings("unchecked")
public class HashTableDemo {

    static class EntryClass<K, V> {
        K key;
        V value;

        EntryClass(K key, V value) {
            this.key = key;
            this.value = value;
        }

        @Override
        public String toString() { return "Entry(" + key + ", " + value + ")"; }
    }

    static class DoubleListNode<E> {
        E element;
        DoubleListNode<E> previous;
        DoubleListNode<E> next;

        DoubleListNode(E element, DoubleListNode<E> previous, DoubleListNode<E> next) {
            this.element = element;
            this.previous = previous;
            this.next = next;
        }

        @Override
        public String toString() { return "DoubleListNode(" + element + ")"; }
    }

    // Bucket: entries kept sorted by key
    static class OrderedDoubleList<K extends Comparable<K>, V> {
        DoubleListNode<EntryClass<K, V>> head;
        DoubleListNode<EntryClass<K, V>> tail;
        int currentSize;

        V insert(K key, V value) {
            DoubleListNode<EntryClass<K, V>> node = head;
            while (node != null && node.element.key.compareTo(key) < 0) {
                node = node.next;
            }
            if (node != null && node.element.key.compareTo(key) == 0) {
                V old = node.element.value;
                node.element.value = value;
                return old;
            }
            DoubleListNode<EntryClass<K, V>> previous = node == null ? tail : node.previous;
            DoubleListNode<EntryClass<K, V>> created = new DoubleListNode<>(new EntryClass<>(key, value), previous, node);
            if (previous == null) { head = created; } else { previous.next = created; }
            if (node == null) { tail = created; } else { node.previous = created; }
            currentSize++;
            return null;
        }

        V remove(K key) {
            DoubleListNode<EntryClass<K, V>> node = head;
            while (node != null && node.element.key.compareTo(key) != 0) {
                node = node.next;
            }
            if (node == null) {
                return null;
            }
            if (node.previous == null) { head = node.next; } else { node.previous.next = node.next; }
            if (node.next == null) { tail = node.previous; } else { node.next.previous = node.previous; }
            currentSize--;
            return node.element.value;
        }
    }

    static class SepChainHashTable<K extends Comparable<K>, V> {
        OrderedDoubleList<K, V>[] table;
        int currentSize;
        int maxSize;

        SepChainHashTable(int capacity) {
            table = (OrderedDoubleList<K, V>[]) new OrderedDoubleList[capacity];
            for (int i = 0; i < capacity; i++) {
                table[i] = new OrderedDoubleList<>();
            }
            maxSize = capacity;
        }

        int hash(K key) { return Math.abs(key.hashCode()) % table.length; }

        void insert(K key, V value) {
            if (table[hash(key)].insert(key, value) == null) {
                currentSize++;
            }
        }

        void remove(K key) {
            if (table[hash(key)].remove(key) != null) {
                currentSize--;
            }
        }
    }

    public static void main(String[] args) {
        SepChainHashTable<String, Integer> ages = new SepChainHashTable<>(5);
        ages.insert("ana", 21); // BREAKPOINT 1
        ages.insert("rui", 34);
        ages.insert("eva", 19); // same bucket as rui: chained, in key order
        ages.insert("ivo", 45);
        ages.insert("bia", 27);
        ages.insert("ana", 22); // existing key: value updated
        ages.remove("rui");

        System.out.println("Done"); // BREAKPOINT 2
    }
}
