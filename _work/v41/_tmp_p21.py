def take(it, k):
    r = []
    for x in it:
        r.append(x)
        if len(r) >= k:
            break
    return r
def nat():
    n = 1
    while True:
        yield n
        n += 1
print(take((x * x for x in nat()), 3))
