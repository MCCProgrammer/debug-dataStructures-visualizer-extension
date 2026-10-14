"""
Binary min-heap for Debug Data Structures Visualizer: the heap is a list where the
children of index i are at 2i+1 and 2i+2. The panel shows the list and the tree.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
"""


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


def main():
    heap = MinHeap()
    heap.insert(50)  # BREAKPOINT 1
    heap.insert(30)
    heap.insert(40)
    heap.insert(10)  # sifts up to the root
    heap.insert(20)
    heap.insert(5)   # new minimum
    heap.remove_min()
    heap.remove_min()

    print("Done")  # BREAKPOINT 2


if __name__ == "__main__":
    main()
