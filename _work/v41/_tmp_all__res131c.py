class W:
    def __init__(self):
        self.n = 0
    def inc(self):
        self.n += 1
        return self
print(W().inc().inc().n)
