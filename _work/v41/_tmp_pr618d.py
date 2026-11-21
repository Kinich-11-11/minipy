class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
def f():
    x.append(9)
    print(x)
f()
print(x)
