class K22:
    n = 0
    def bump(self):
        K22.n += 10
        return K22.n
    def two(self):
        return K22.n + self.bump()
o22 = K22()
print(o22.two())
