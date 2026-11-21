def f(a):
    a = a + [1]
    return a
acc = []
r1 = f(acc)
r2 = f(acc)
print(acc, r1, r2)
