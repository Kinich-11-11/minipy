def naturals():
    n = 1
    while True:
        yield n
        n += 1
def __gxM(s):
    while True:
        x = next(s)
        yield x * x
s2 = naturals()
g = __gxM(s2)
print(next(g))
print(next(g))
