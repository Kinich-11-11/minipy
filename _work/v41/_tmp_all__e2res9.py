class M2:
    def __init__(self, v):
        self.v = v
    def vals(self):
        return [self.v]
c1 = M2(0)
d2 = M2(2)
e1 = M2(1)
print(e1.v, c1.vals(), d2.vals())
