def f(a, n):
    i = 0
    while i < n - 1:
        a[i], a[i + 1] = a[i + 1], a[i]
        i = i + 1
lst = [1, 2, 3, 4]
f(lst, 4)
print(lst)
