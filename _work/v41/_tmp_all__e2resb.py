class M:
    def __init__(self, v, a, b):
        self.v = v
        self.a = a
        self.b = b
    def vals(self):
        out = [self.v]
        if self.a is not None:
            out.extend(self.a.vals())
        if self.b is not None:
            out.extend(self.b.vals())
        return out
m0 = M(0, None, None)
p2 = M(2, None, None)
m1 = M(1, m0, p2)
q = M(5, m1, None)
print(q.vals())
