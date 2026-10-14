"""
Linked lists for Debug Data Structures Visualizer: singly linked (val / next)
and doubly linked like the course's DoubleList (element / previous / next).

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
"""


class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val!r})"


class LinkedList:
    def __init__(self):
        self.head = None
        self.size = 0

    def append(self, val):
        node = ListNode(val)
        if self.head is None:
            self.head = node
        else:
            current = self.head
            while current.next:
                current = current.next
            current.next = node
        self.size += 1

    def remove(self, val):
        if self.head and self.head.val == val:
            self.head = self.head.next
            self.size -= 1
            return
        current = self.head
        while current and current.next:
            if current.next.val == val:
                current.next = current.next.next
                self.size -= 1
                return
            current = current.next


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

    def add_first(self, element):
        node = DoubleListNode(element, None, self.head)
        if self.head is None:
            self.tail = node
        else:
            self.head.previous = node
        self.head = node
        self.currentSize += 1

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

    def remove_last(self):
        element = self.tail.element
        self.tail = self.tail.previous
        if self.tail is None:
            self.head = None
        else:
            self.tail.next = None
        self.currentSize -= 1
        return element


def main():
    # 1. Singly linked list
    numbers = LinkedList()
    numbers.append(3)  # BREAKPOINT 1
    numbers.append(1)
    numbers.append(4)
    numbers.append(1)
    numbers.append(5)
    numbers.remove(4)

    # 2. Doubly linked list
    names = DoubleList()
    names.add_last("ana")  # BREAKPOINT 2
    names.add_last("bruno")
    names.add_first("carla")
    names.add_last("diogo")
    names.remove_first()
    names.remove_last()

    print("Done")  # BREAKPOINT 3


if __name__ == "__main__":
    main()
