def bsort(a):
    b = a[:]
    n = len(b)
    for i in range(n):
        for j in range(n - 1 - i):
            if b[j] > b[j + 1]:
                b[j], b[j + 1] = b[j + 1], b[j]
    return b
data = [5, 2, 9, 1, 7, 3]
print(bsort(data), data)
