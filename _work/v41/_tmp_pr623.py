class Node:
    def __init__(self, val):
        self.val = val
        self.next = None
class LinkedList:
    def __init__(self):
        self.head = None
    def append(self, v):
        n = Node(v)
        if self.head is None:
            self.head = n
            return
        cur = self.head
        while cur.next is not None:
            cur = cur.next
        cur.next = n
ll = LinkedList()
for v in [1, 2]:
    ll.append(v)
empty = LinkedList()
print(empty.head)
print(ll.head.val)

