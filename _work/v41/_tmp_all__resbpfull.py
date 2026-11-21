def bsearch(a, target):
    lo = 0
    hi = len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
data = [1, 3, 5, 7, 9, 11]
print(bsearch(data, 7), bsearch(data, 1), bsearch(data, 12), bsearch([], 1))
