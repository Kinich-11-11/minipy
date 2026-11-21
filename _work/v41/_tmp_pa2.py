def naturals():
    n = 1
    while True:
        yield n
        n += 1
g = naturals()
out = []
for _ in range(5):
    out.append(next(g))
print(out)
def take(gen, k):
    res = []
    i = 0
    while i < k:
        res.append(next(gen))
        i += 1
    return res
print(take(naturals(), 6))
print(take((x * x for x in naturals()), 4))
