class P:
    def __init__(self, v):
        self.v = v
        self.l = None
    def ins(self, v):
        if v < self.v:
            if self.l is None:
                self.l = P(v)
                print("wrote self.v=", self.v, "self.l.v=", self.l.v)
            else:
                print("recursing at", self.v)
                self.l.ins(v)
                print("back at", self.v, "self.l.v=", self.l.v)
p = P(5)
p.ins(3)
p.ins(1)
print(p.v, p.l.v, p.l.l)
