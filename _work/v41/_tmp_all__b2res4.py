def f(a):
    a[0], a[1] = a[1], a[0]
    return a[0] + a[1]
lst = [1, 2]
print(f(lst), lst)
