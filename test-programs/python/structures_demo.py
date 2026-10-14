"""
Test program for Debug Data Structures Visualizer: lists, stacks, queues, heaps,
hash tables and n-ary trees.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+Opt+V (Ctrl+Alt+V). See ../TESTING.md.
"""


# --- Singly linked list: val / next ------------------------------------------
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


# --- Doubly linked list, like the course's DoubleList: element / previous / next
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


# --- Stack on top of a list, stack in an array, circular queue in an array ----
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


# --- Binary min-heap stored in a list -----------------------------------------
class MinHeap:
    def __init__(self):
        self.heap = []

    def insert(self, key):
        self.heap.append(key)
        hole = len(self.heap) - 1
        while hole > 0 and self.heap[(hole - 1) // 2] > self.heap[hole]:
            parent = (hole - 1) // 2
            self.heap[hole], self.heap[parent] = self.heap[parent], self.heap[hole]
            hole = parent

    def remove_min(self):
        smallest = self.heap[0]
        last = self.heap.pop()
        if self.heap:
            self.heap[0] = last
            hole = 0
            while True:
                child = 2 * hole + 1
                if child >= len(self.heap):
                    break
                if child + 1 < len(self.heap) and self.heap[child + 1] < self.heap[child]:
                    child += 1
                if self.heap[child] >= self.heap[hole]:
                    break
                self.heap[hole], self.heap[child] = self.heap[child], self.heap[hole]
                hole = child
        return smallest


# --- Hash table with separate chaining: buckets of (key, value) pairs ---------
class HashTable:
    def __init__(self, capacity):
        self.buckets = [[] for _ in range(capacity)]
        self.size = 0

    def put(self, key, value):
        bucket = self.buckets[sum(map(ord, key)) % len(self.buckets)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self.size += 1


# --- N-ary tree (children list) and trie (children dict) ----------------------
class NaryNode:
    def __init__(self, val, children=None):
        self.val = val
        self.children = children or []

    def __repr__(self):
        return f"NaryNode({self.val!r})"


class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for letter in word:
            node = node.children.setdefault(letter, TrieNode())
        node.is_word = True


def main():
    # 1. Linked lists: Step Over to watch them grow
    numbers = LinkedList()
    numbers.append(3)  # BREAKPOINT 1
    numbers.append(1)
    numbers.append(4)
    numbers.append(1)
    numbers.append(5)

    names = DoubleList()
    names.add_last("ana")
    names.add_last("bruno")
    names.add_first("carla")
    names.add_last("diogo")
    names.remove_first()

    # 2. Stacks and a circular queue
    calls = StackInList()
    calls.push("main")  # BREAKPOINT 2
    calls.push("insert")
    calls.push("rebalance")
    calls.pop()

    undo = StackInArray(6)
    undo.push("type")
    undo.push("bold")
    undo.push("delete")
    undo.pop()

    queue = QueueInArray(6)
    queue.enqueue("A")
    queue.enqueue("B")
    queue.enqueue("C")
    queue.enqueue("D")
    queue.dequeue()
    queue.dequeue()
    queue.enqueue("E")
    queue.enqueue("F")
    queue.enqueue("G")  # wraps around to index 0

    # 3. Min-heap: every insert sifts the new key up
    heap = MinHeap()
    heap.insert(50)  # BREAKPOINT 3
    heap.insert(30)
    heap.insert(40)
    heap.insert(10)
    heap.insert(20)
    heap.insert(5)
    heap.remove_min()

    # 4. Hash table with separate chaining
    ages = HashTable(5)
    ages.put("ana", 21)  # BREAKPOINT 4
    ages.put("rui", 34)
    ages.put("eva", 19)
    ages.put("ivo", 45)
    ages.put("bia", 27)
    ages.put("ana", 22)

    # 5. N-ary tree and trie
    company = NaryNode("CEO", [
        NaryNode("CTO", [NaryNode("Dev 1"), NaryNode("Dev 2"), NaryNode("Dev 3")]),
        NaryNode("CFO", [NaryNode("Accountant")]),
        NaryNode("COO"),
    ])
    words = Trie()
    words.insert("car")  # BREAKPOINT 5
    words.insert("cat")
    words.insert("cart")
    words.insert("dog")

    print("Done")  # BREAKPOINT 6: every structure at once


if __name__ == "__main__":
    main()
