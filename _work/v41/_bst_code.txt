class TNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
class BST:
    def __init__(self):
        self.root = None
    def insert(self, key):
        if self.root is None:
            self.root = TNode(key)
            return
        cur = self.root
        while True:
            if key < cur.key:
                if cur.left is None:
                    cur.left = TNode(key)
                    return
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = TNode(key)
                    return
                cur = cur.right
    def inorder(self):
        out = []
        def walk(n):
            if n is None:
                return
            walk(n.left)
            out.append(n.key)
            walk(n.right)
        walk(self.root)
        return out
t = BST()
for k in [5, 3, 8, 1, 4, 7, 9]:
    t.insert(k)
print(t.inorder())
