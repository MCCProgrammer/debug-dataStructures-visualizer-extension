import java.util.ArrayList;
import java.util.List;

/**
 * Test program for Debug Data Structures Visualizer: lists, stacks, queues, heaps,
 * hash tables and n-ary trees, written like the classes of a data structures course.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+Opt+V (Ctrl+Alt+V). See ../TESTING.md.
 */
@SuppressWarnings("unchecked")
public class StructuresDemo {

    // --- Singly linked list: element / next -------------------------------------
    static class SListNode<E> {
        E element;
        SListNode<E> next;

        SListNode(E element) { this.element = element; }

        @Override
        public String toString() { return "SListNode(" + element + ")"; }
    }

    static class SinglyLinkedList<E> {
        SListNode<E> head;
        int currentSize;

        void addLast(E element) {
            SListNode<E> node = new SListNode<>(element);
            if (head == null) {
                head = node;
            } else {
                SListNode<E> current = head;
                while (current.next != null) {
                    current = current.next;
                }
                current.next = node;
            }
            currentSize++;
        }
    }

    // --- Doubly linked list: element / previous / next, head / tail -----------
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

    static class DoubleList<E> {
        DoubleListNode<E> head;
        DoubleListNode<E> tail;
        int currentSize;

        void addFirst(E element) {
            DoubleListNode<E> node = new DoubleListNode<>(element, null, head);
            if (head == null) {
                tail = node;
            } else {
                head.previous = node;
            }
            head = node;
            currentSize++;
        }

        void addLast(E element) {
            DoubleListNode<E> node = new DoubleListNode<>(element, tail, null);
            if (tail == null) {
                head = node;
            } else {
                tail.next = node;
            }
            tail = node;
            currentSize++;
        }

        E removeFirst() {
            E element = head.element;
            head = head.next;
            if (head == null) {
                tail = null;
            } else {
                head.previous = null;
            }
            currentSize--;
            return element;
        }
    }

    // --- Stack on top of a list, stack in an array, circular queue in an array -
    static class StackInList<E> {
        DoubleList<E> list = new DoubleList<>();

        void push(E element) { list.addFirst(element); }

        E pop() { return list.removeFirst(); }
    }

    static class StackInArray<E> {
        E[] array;
        int top = -1;

        StackInArray(int capacity) { array = (E[]) new Object[capacity]; }

        void push(E element) { array[++top] = element; }

        E pop() {
            E element = array[top];
            array[top--] = null;
            return element;
        }
    }

    static class QueueInArray<E> {
        E[] array;
        int front;
        int rear;
        int currentSize;

        QueueInArray(int capacity) {
            array = (E[]) new Object[capacity];
            front = 0;
            rear = capacity - 1;
            currentSize = 0;
        }

        void enqueue(E element) {
            rear = (rear + 1) % array.length;
            array[rear] = element;
            currentSize++;
        }

        E dequeue() {
            E element = array[front];
            array[front] = null;
            front = (front + 1) % array.length;
            currentSize--;
            return element;
        }
    }

    // --- Binary min-heap of entries in an array ---------------------------------
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

    // --- Hash table with separate chaining: each bucket is an ordered list -----
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
            EntryClass<K, V> entry = new EntryClass<>(key, value);
            DoubleListNode<EntryClass<K, V>> previous = node == null ? tail : node.previous;
            DoubleListNode<EntryClass<K, V>> created = new DoubleListNode<>(entry, previous, node);
            if (previous == null) { head = created; } else { previous.next = created; }
            if (node == null) { tail = created; } else { node.previous = created; }
            currentSize++;
            return null;
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

        void insert(K key, V value) {
            int index = Math.abs(key.hashCode()) % table.length;
            if (table[index].insert(key, value) == null) {
                currentSize++;
            }
        }
    }

    // --- N-ary tree: element / children -----------------------------------------
    static class NaryTreeNode<E> {
        E element;
        List<NaryTreeNode<E>> children = new ArrayList<>();

        NaryTreeNode(E element) { this.element = element; }

        NaryTreeNode<E> add(NaryTreeNode<E> child) {
            children.add(child);
            return this;
        }

        @Override
        public String toString() { return "NaryTreeNode(" + element + ")"; }
    }

    public static void main(String[] args) {
        // 1. Linked lists: Step Over to watch them grow
        SinglyLinkedList<Integer> numbers = new SinglyLinkedList<>();
        numbers.addLast(3); // BREAKPOINT 1
        numbers.addLast(1);
        numbers.addLast(4);
        numbers.addLast(1);
        numbers.addLast(5);

        DoubleList<String> names = new DoubleList<>();
        names.addLast("ana");
        names.addLast("bruno");
        names.addFirst("carla");
        names.addLast("diogo");
        names.removeFirst();

        // 2. Stacks and a circular queue
        StackInList<String> calls = new StackInList<>();
        calls.push("main"); // BREAKPOINT 2
        calls.push("insert");
        calls.push("rebalance");
        calls.pop();

        StackInArray<String> undo = new StackInArray<>(6);
        undo.push("type");
        undo.push("bold");
        undo.push("delete");
        undo.pop();

        QueueInArray<String> queue = new QueueInArray<>(6);
        queue.enqueue("A");
        queue.enqueue("B");
        queue.enqueue("C");
        queue.enqueue("D");
        queue.dequeue();
        queue.dequeue();
        queue.enqueue("E");
        queue.enqueue("F");
        queue.enqueue("G"); // wraps around to index 0

        // 3. Min-heap: every insert sifts the new key up
        MinHeap<Integer, String> heap = new MinHeap<>(10);
        heap.insert(50, "fifty"); // BREAKPOINT 3
        heap.insert(30, "thirty");
        heap.insert(40, "forty");
        heap.insert(10, "ten");
        heap.insert(20, "twenty");
        heap.insert(5, "five");
        heap.removeMin();

        // 4. Hash table with separate chaining
        SepChainHashTable<String, Integer> ages = new SepChainHashTable<>(5);
        ages.insert("ana", 21); // BREAKPOINT 4
        ages.insert("rui", 34);
        ages.insert("eva", 19);
        ages.insert("ivo", 45);
        ages.insert("bia", 27);
        ages.insert("ana", 22);

        // 5. N-ary tree
        NaryTreeNode<String> company = new NaryTreeNode<>("CEO")
                .add(new NaryTreeNode<>("CTO").add(new NaryTreeNode<>("Dev 1")).add(new NaryTreeNode<>("Dev 2")).add(new NaryTreeNode<>("Dev 3")))
                .add(new NaryTreeNode<>("CFO").add(new NaryTreeNode<>("Accountant")))
                .add(new NaryTreeNode<>("COO"));
        System.out.println("Company tree ready"); // BREAKPOINT 5

        System.out.println("Done"); // BREAKPOINT 6: every structure at once
    }
}
