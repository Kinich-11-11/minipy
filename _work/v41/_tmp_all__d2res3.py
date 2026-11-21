class BT:
    def __init__(self, v):
        self.v = v
        self.l = None
        self.r = None
    def ins(self, v):
        if v < self.v:
            if self.l is None:
                self.l = BT(v)
            else:
                self.l.ins(v)
        else:
            if self.r is None:
                self.r = BT(v)
            else:
                self.r.ins(v)
    def inorder(self):
        out = []
        if self.l is not None:
            out.extend(self.l.inorder())
        out.append(self.v)
        if self.r is not None:
            out.extend(self.r.inorder())
        return out
root = BT(5)
root.ins(3)
root.ins(8)
print(root.inorder())
