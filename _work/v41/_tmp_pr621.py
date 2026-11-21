class Node:
    def __init__(self, val):
        self.val = val
        self.next = None
class LL:
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
a = LL()
a.append(1)
a.append(2)
print(a.head.val)
b = LL()
b.append(3)
print(b.head.val)
