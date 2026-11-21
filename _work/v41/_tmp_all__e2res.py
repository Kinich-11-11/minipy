def h(x):
    return [x]
def g(n):
    out = [n]
    if n > 0:
        out.extend(h(n) + g(n - 1))
    return out
print(g(4))
