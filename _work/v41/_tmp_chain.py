class Box:
    def __init__(self, v):
        self.inner = Inner(v)
class Inner:
    def __init__(self, v):
        self.v = v
        self.tag = 't' + str(v)
b = Box(42)
print(b.inner.v)
print(b.inner.tag)
print(b.inner.v - 2)
print(b.inner.v / 2)
print(str(b.inner.v) + '!')
print(b.inner.v % 5)
b.inner.v -= 2
print(b.inner.v)
b.inner.tag += '!'
print(b.inner.tag)
