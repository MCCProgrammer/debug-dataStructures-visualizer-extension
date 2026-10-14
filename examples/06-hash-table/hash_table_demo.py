"""
Hash table with separate chaining for Debug Data Structures Visualizer:
a list of buckets, each a list of (key, value) pairs.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5),
then open the visualizer with Cmd+K Cmd+V (Ctrl+K Ctrl+V). See README.md in this folder.
"""


class HashTable:
    def __init__(self, capacity):
        self.buckets = [[] for _ in range(capacity)]
        self.size = 0

    def _index(self, key):
        return sum(map(ord, key)) % len(self.buckets)

    def put(self, key, value):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self.size += 1

    def remove(self, key):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                del bucket[i]
                self.size -= 1
                return


def main():
    ages = HashTable(5)
    ages.put("ana", 21)  # BREAKPOINT 1
    ages.put("rui", 34)
    ages.put("eva", 19)  # same bucket as rui: chained
    ages.put("ivo", 45)
    ages.put("bia", 27)
    ages.put("ana", 22)  # existing key: value updated
    ages.remove("rui")

    print("Done")  # BREAKPOINT 2


if __name__ == "__main__":
    main()
