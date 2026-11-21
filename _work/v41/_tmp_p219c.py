def nat():
    n = 1
    while True:
        yield n
        n += 1
g = nat()
print(next(g))
print(next(g))
print(next(g))
print(next(g))
