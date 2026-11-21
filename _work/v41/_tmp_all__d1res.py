class P:
    def __init__(self, v):
        self.v = v
        self.l = None
    def ins(self, v):
        if self.l is None:
            self.l = P(v)
p = P(5)
p.ins(3)
print(p.l.v)
