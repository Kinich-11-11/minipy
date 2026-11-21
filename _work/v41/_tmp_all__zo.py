class W7:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def mk(self, k):
        return W7(self.x + k, self.y + k)
print(W7(1, 2).mk(10).x)
