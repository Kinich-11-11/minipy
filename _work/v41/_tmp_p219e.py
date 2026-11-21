def nat():
    n = 1
    while True:
        yield n
        n += 1
g = (x * x for x in nat())
print(next(g))
print(next(g))
