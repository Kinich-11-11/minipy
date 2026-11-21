def dbl3(x):
    return x * 2
gg3 = inc2b
def inc2b(x):
    return x + 1
lam2b = lambda x: dbl3(gg3(x))
print(lam2b(5))
