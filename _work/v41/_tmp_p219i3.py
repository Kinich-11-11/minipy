def h(x):
    return x + 1
def f():
    v = h(4)
    yield v
g = f()
print(next(g))
