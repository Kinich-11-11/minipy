class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
x.append(2)
b.v.append(1)
print(x, b.v)
