def f(a):
    a = a + [1]
    return a
xs = []
r1 = f(xs)
print(xs, r1)
