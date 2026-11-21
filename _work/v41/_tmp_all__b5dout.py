def ten3(x):
    return 10
def ap4(f, v):
    return lambda x: f(x) + v
h4 = ap4(ten3, 5)
print(h4(1))
