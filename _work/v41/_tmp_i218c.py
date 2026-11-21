class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
b.v.append(1)
x.append(2)
print(x, b.v)
print(x is b.v if False else 'na')
