/**
 * Linked lists for Debug Data Structures Visualizer: singly linked (element / next)
 * and doubly linked like the course's DoubleList (element / previous / next).
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
public class LinkedListDemo {

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

        void remove(E element) {
            if (head != null && head.element.equals(element)) {
                head = head.next;
                currentSize--;
                return;
            }
            SListNode<E> current = head;
            while (current != null && current.next != null) {
                if (current.next.element.equals(element)) {
                    current.next = current.next.next;
                    currentSize--;
                    return;
                }
                current = current.next;
            }
        }
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

    static class DoubleList<E> {
        DoubleListNode<E> head;
        DoubleListNode<E> tail;
        int currentSize;

        void addFirst(E element) {
            DoubleListNode<E> node = new DoubleListNode<>(element, null, head);
            if (head == null) { tail = node; } else { head.previous = node; }
            head = node;
            currentSize++;
        }

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

        E removeLast() {
            E element = tail.element;
            tail = tail.previous;
            if (tail == null) { head = null; } else { tail.next = null; }
            currentSize--;
            return element;
        }
    }

    public static void main(String[] args) {
        // 1. Singly linked list
        SinglyLinkedList<Integer> numbers = new SinglyLinkedList<>();
        numbers.addLast(3); // BREAKPOINT 1
        numbers.addLast(1);
        numbers.addLast(4);
        numbers.addLast(1);
        numbers.addLast(5);
        numbers.remove(4);

        // 2. Doubly linked list
        DoubleList<String> names = new DoubleList<>();
        names.addLast("ana"); // BREAKPOINT 2
        names.addLast("bruno");
        names.addFirst("carla");
        names.addLast("diogo");
        names.removeFirst();
        names.removeLast();

        System.out.println("Done"); // BREAKPOINT 3
    }
}
