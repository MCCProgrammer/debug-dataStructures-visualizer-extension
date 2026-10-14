/**
 * Stacks for Debug Data Structures Visualizer: a stack on top of a doubly linked list
 * (like the course's StackInList) and a stack in an array (StackInArray).
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
 * then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
 */
@SuppressWarnings("unchecked")
public class StackDemo {

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

        E removeFirst() {
            E element = head.element;
            head = head.next;
            if (head == null) { tail = null; } else { head.previous = null; }
            currentSize--;
            return element;
        }
    }

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

    public static void main(String[] args) {
        // 1. Stack on a list: the top is the head of the list
        StackInList<String> calls = new StackInList<>();
        calls.push("main"); // BREAKPOINT 1
        calls.push("insert");
        calls.push("rebalance");
        calls.pop();

        // 2. Stack in an array: top is the index of the last element
        StackInArray<String> undo = new StackInArray<>(6);
        undo.push("type"); // BREAKPOINT 2
        undo.push("bold");
        undo.push("delete");
        undo.pop();

        System.out.println("Done"); // BREAKPOINT 3
    }
}
