class P:
    def __init__(self, v):
        self.v = v
        self.l = None
    def ins(self, v):
        if v < self.v:
            if self.l is None:
                self.l = P(v)
            else:
                s2 = self
                self.l.ins(v)
                print("row-back", s2.v, "read", self.v, "l", self.l.v)
p = P(5)
p.ins(3)
p.ins(1)
print(p.v, p.l.v, p.l.l.v)
