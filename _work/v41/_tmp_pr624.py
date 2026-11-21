class B:
    def __init__(self):
        self.head = None
    def f(self):
        out = []
        cur = self.head
        out.append(0)
        cur = cur.next if False else None
        return out
a = B()
print(a.f())
b = B()
print(b.f())
