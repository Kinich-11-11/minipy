class M:
    def __init__(self, v, kid):
        self.v = v
        self.kid = kid
    def vals(self):
        return [self.v]
m2 = M(2, None)
m1 = M(1, m2)
print(m1.kid.vals())
