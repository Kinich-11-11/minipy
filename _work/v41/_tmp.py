def bad():
    yield 1
    raise ValueError("gen")
g = bad()
print(next(g))
try:
    next(g)
except ValueError as e:
    print("gen err", e)
