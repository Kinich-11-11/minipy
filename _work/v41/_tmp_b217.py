class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
x.append(1)
print(x, b.v)
b.v.append(2)
print(x, b.v)
