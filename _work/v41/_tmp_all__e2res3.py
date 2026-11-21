class C:
    def __init__(self, n):
        self.n = n
        self.child = None
    def link(self, other):
        self.child = other
    def vals(self):
        out = [self.n]
        if self.child is not None:
            out.extend(self.child.vals())
        return out
c3 = C(3)
c2 = C(2)
c1 = C(1)
c0 = C(0)
c3.link(c2)
c2.link(c1)
c1.link(c0)
print(c3.vals())
