"""
Stacks for Debug Data Structures Visualizer: a stack on top of a doubly linked list
(like the course's StackInList), a stack in an array (StackInArray) and a plain list.

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

    def add_first(self, element):
        node = DoubleListNode(element, None, self.head)
        if self.head is None:
            self.tail = node
        else:
            self.head.previous = node
        self.head = node
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


class StackInList:
    def __init__(self):
        self.list = DoubleList()

    def push(self, element):
        self.list.add_first(element)

    def pop(self):
        return self.list.remove_first()


class StackInArray:
    def __init__(self, capacity):
        self.array = [None] * capacity
        self.top = -1

    def push(self, element):
        self.top += 1
        self.array[self.top] = element

    def pop(self):
        element = self.array[self.top]
        self.array[self.top] = None
        self.top -= 1
        return element


def main():
    # 1. Stack on a list: the top is the head of the list
    calls = StackInList()
    calls.push("main")  # BREAKPOINT 1
    calls.push("insert")
    calls.push("rebalance")
    calls.pop()

    # 2. Stack in an array: top is the index of the last element
    undo = StackInArray(6)
    undo.push("type")  # BREAKPOINT 2
    undo.push("bold")
    undo.push("delete")
    undo.pop()

    # 3. Python list used as a stack (detected because it is named "stack")
    stack = []
    stack.append(10)  # BREAKPOINT 3
    stack.append(20)
    stack.append(30)
    stack.pop()

    print("Done")  # BREAKPOINT 4


if __name__ == "__main__":
    main()
