def sift(a, n, i):
    while True:
        big = i
        l = 2 * i + 1
        r = 2 * i + 2
        if l < n and a[l] > a[big]:
            big = l
        if r < n and a[r] > a[big]:
            big = r
        if big == i:
            return
        a[i], a[big] = a[big], a[i]
        i = big
def hsort(a):
    h = a[:]
    n = len(h)
    for i in range(n // 2 - 1, -1, -1):
        sift(h, n, i)
    for end in range(n - 1, 0, -1):
        h[0], h[end] = h[end], h[0]
        sift(h, end, 0)
    return h
print(hsort([9, 4, 7, 1, 8, 2, 6, 3, 5]), hsort([1]), hsort([]))
