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
h = [9, 4, 7, 1, 8, 2, 6, 3, 5]
n = len(h)
for i in range(n // 2 - 1, -1, -1):
    sift(h, n, i)
print(h)
