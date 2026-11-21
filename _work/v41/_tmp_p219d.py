def nat():
    n = 1
    while True:
        yield n
        n += 1
src = nat()
def outer():
    while True:
        yield next(src)
g = outer()
print(next(g))
print(next(g))
print(next(g))
