class N:
    def __init__(self, v):
        self.v=v
ns=[N(1)]
def f():
    return ns[0]
x = f().v
x += 5
print(x)
