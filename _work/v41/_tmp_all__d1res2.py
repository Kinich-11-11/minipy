class P:
    def __init__(self, v):
        self.v = v
        self.l = None
        self.r = None
    def ins(self, v):
        if v < self.v:
            self.l = P(v) if self.l is None else self.l.ins2(v)
    def ins2(self, v):
        self.l = P(v)
p = P(5)
p.ins(3)
p.ins(1)
print(p.v, p.l.v, p.l.l.v, p.r)
