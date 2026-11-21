def naturals():
    n = 1
    while True:
        yield n
        n += 1
g = (x for x in naturals())
print(next(g))
print(next(g))
print(next(g))
