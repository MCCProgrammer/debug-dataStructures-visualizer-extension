"""
Queues for Debug Data Structures Visualizer: a queue on top of a doubly linked list
(like the course's QueueInList) and a circular queue in an array (QueueInArray).

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
"""


class DoubleListNode:
    def __init__(self, element, previous=None, next=None):
        self.element = element
        self.previous = previous
        self.next = next

    def __repr__(self):
        return f"DoubleListNode({self.element!r})"


class DoubleList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.currentSize = 0

    def add_last(self, element):
        node = DoubleListNode(element, self.tail, None)
        if self.tail is None:
            self.head = node
        else:
            self.tail.next = node
        self.tail = node
        self.currentSize += 1

    def remove_first(self):
        element = self.head.element
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        else:
            self.head.previous = None
        self.currentSize -= 1
        return element


class QueueInList:
    def __init__(self):
        self.list = DoubleList()

    def enqueue(self, element):
        self.list.add_last(element)

    def dequeue(self):
        return self.list.remove_first()


class QueueInArray:
    def __init__(self, capacity):
        self.array = [None] * capacity
        self.front = 0
        self.rear = capacity - 1
        self.currentSize = 0

    def enqueue(self, element):
        self.rear = (self.rear + 1) % len(self.array)
        self.array[self.rear] = element
        self.currentSize += 1

    def dequeue(self):
        element = self.array[self.front]
        self.array[self.front] = None
        self.front = (self.front + 1) % len(self.array)
        self.currentSize -= 1
        return element


def main():
    # 1. Queue on a list: front is the head, rear is the tail
    line = QueueInList()
    line.enqueue("ana")  # BREAKPOINT 1
    line.enqueue("bruno")
    line.enqueue("carla")
    line.dequeue()
    line.enqueue("diogo")

    # 2. Circular queue in an array of 6
    queue = QueueInArray(6)
    queue.enqueue("A")  # BREAKPOINT 2
    queue.enqueue("B")
    queue.enqueue("C")
    queue.enqueue("D")
    queue.dequeue()
    queue.dequeue()
    queue.enqueue("E")
    queue.enqueue("F")
    queue.enqueue("G")  # wraps around to index 0

    print("Done")  # BREAKPOINT 3


if __name__ == "__main__":
    main()
