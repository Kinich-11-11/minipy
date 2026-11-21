def nat():
    n = 0
    while True:
        yield n
        n += 1
def take(g, k):
    r = []
    i = 0
    while i < k:
        r.append(next(g))
        i += 1
    return r
print(take((x + 1 for x in nat()), 3))
print(take((x * 2 for x in nat()), 2))
