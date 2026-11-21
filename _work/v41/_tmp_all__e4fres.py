def echo(f):
    return f
def g(n):
    return n + 1
h = echo(g)
print(h(5))
