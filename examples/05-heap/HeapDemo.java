/**
 * Binary min-heap of entries for Debug Data Structures Visualizer, like the course's MinHeap:
 * an array of entries plus currentSize, where the children of index i are at 2i+1 and 2i+2.
 * The panel shows the array and the tree.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
@SuppressWarnings("unchecked")
public class HeapDemo {

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

    static class MinHeap<K extends Comparable<K>, V> {
        EntryClass<K, V>[] array;
        int currentSize;

        MinHeap(int capacity) { array = (EntryClass<K, V>[]) new EntryClass[capacity]; }

        void insert(K key, V value) {
            int hole = currentSize++;
            while (hole > 0 && array[(hole - 1) / 2].key.compareTo(key) > 0) {
                array[hole] = array[(hole - 1) / 2];
                hole = (hole - 1) / 2;
            }
            array[hole] = new EntryClass<>(key, value);
        }

        EntryClass<K, V> removeMin() {
            EntryClass<K, V> min = array[0];
            EntryClass<K, V> last = array[--currentSize];
            array[currentSize] = null;
            if (currentSize > 0) {
                int hole = 0;
                while (2 * hole + 1 < currentSize) {
                    int child = 2 * hole + 1;
                    if (child + 1 < currentSize && array[child + 1].key.compareTo(array[child].key) < 0) {
                        child++;
                    }
                    if (array[child].key.compareTo(last.key) >= 0) {
                        break;
                    }
                    array[hole] = array[child];
                    hole = child;
                }
                array[hole] = last;
            }
            return min;
        }
    }

    public static void main(String[] args) {
        MinHeap<Integer, String> heap = new MinHeap<>(10);
        heap.insert(50, "fifty"); // BREAKPOINT 1
        heap.insert(30, "thirty");
        heap.insert(40, "forty");
        heap.insert(10, "ten"); // sifts up to the root
        heap.insert(20, "twenty");
        heap.insert(5, "five"); // new minimum
        heap.removeMin();
        heap.removeMin();

        System.out.println("Done"); // BREAKPOINT 2
    }
}
