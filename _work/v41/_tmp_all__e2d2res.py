class N:
    def __init__(self, v, a, b):
        self.v = v
        self.a = a
        self.b = b
    def vals(self):
        out = [self.v]
        print("enter", self.v)
        if self.a is not None:
            out.extend(self.a.vals())
        x = self
        print("after-a: row-copy", x.v, "direct", self.v)
        return out
l0 = N(0, None, None)
l1 = N(1, l0, None)
top = N(5, l1, None)
print(top.vals())
