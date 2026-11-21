a = [5, 2, 9, 1, 5, 6]
n = len(a)
for i in range(n):
    for j in range(n - 1 - i):
        if a[j] > a[j + 1]:
            t = a[j]
            a[j] = a[j + 1]
            a[j + 1] = t
print(a)
