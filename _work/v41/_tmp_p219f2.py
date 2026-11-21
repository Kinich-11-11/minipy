def g3():
    yield 4
    yield 5
def h(x):
    return x + 1
g = (h(x) for x in g3())
print(next(g), next(g))
