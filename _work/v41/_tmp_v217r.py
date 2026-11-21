class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
def f():
    b.v.append(7)
f()
print(x, b.v)
