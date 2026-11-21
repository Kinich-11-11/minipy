def g(n, out):
    if n == 0:
        return
    g(n - 1, out)
    out.append(n)
out = []
g(3, out)
print(out)
