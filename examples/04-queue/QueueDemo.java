/**
 * Queues for Debug Data Structures Visualizer: a queue on top of a doubly linked list
 * (like the course's QueueInList) and a circular queue in an array (QueueInArray).
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
@SuppressWarnings("unchecked")
public class QueueDemo {

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

        void addLast(E element) {
            DoubleListNode<E> node = new DoubleListNode<>(element, tail, null);
            if (tail == null) { head = node; } else { tail.next = node; }
            tail = node;
            currentSize++;
        }

        E removeFirst() {
            E element = head.element;
            head = head.next;
            if (head == null) { tail = null; } else { head.previous = null; }
            currentSize--;
            return element;
        }
    }

    static class QueueInList<E> {
        DoubleList<E> list = new DoubleList<>();

        void enqueue(E element) { list.addLast(element); }

        E dequeue() { return list.removeFirst(); }
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

    public static void main(String[] args) {
        // 1. Queue on a list: front is the head, rear is the tail
        QueueInList<String> line = new QueueInList<>();
        line.enqueue("ana"); // BREAKPOINT 1
        line.enqueue("bruno");
        line.enqueue("carla");
        line.dequeue();
        line.enqueue("diogo");

        // 2. Circular queue in an array of 6
        QueueInArray<String> queue = new QueueInArray<>(6);
        queue.enqueue("A"); // BREAKPOINT 2
        queue.enqueue("B");
        queue.enqueue("C");
        queue.enqueue("D");
        queue.dequeue();
        queue.dequeue();
        queue.enqueue("E");
        queue.enqueue("F");
        queue.enqueue("G"); // wraps around to index 0

        System.out.println("Done"); // BREAKPOINT 3
    }
}
