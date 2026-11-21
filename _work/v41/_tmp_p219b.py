def f():
    yield 1
g = f()
print(next(g))
