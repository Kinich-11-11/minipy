class C:
    def __init__(self, p):
        self.p = p
    def mk(self, k):
        return C(self.p + k)
print(C(1).mk(10).p)
