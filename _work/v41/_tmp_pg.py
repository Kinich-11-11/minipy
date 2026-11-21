class N:
    def __init__(self, v):
        self.v=v
ns=[N(1)]
def f():
    return ns[0]
f().v += 5
print(ns[0].v)
