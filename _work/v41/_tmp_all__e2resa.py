class M:
    def __init__(self, v, aa, bb):
        self.v = v
        self.aa = aa
        self.bb = bb
    def probe(self):
        r = []
        if self.aa is not None:
            r.append(self.aa)
        if self.bb is not None:
            r.append(self.bb)
        return r
m2 = M(5, 10, 20)
print(m2.probe())
