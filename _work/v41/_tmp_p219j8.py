def h(x):
    return x + 1
def f():
    yield h(4)
g = f()
print(next(g))
