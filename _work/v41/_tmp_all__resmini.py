def qsort(a):
    if len(a) <= 1:
        return a
    p = a[0]
    left = []
    right = []
    for x in a[1:]:
        if x < p:
            left.append(x)
        else:
            right.append(x)
    return qsort(left) + [p] + qsort(right)
print(qsort([8, 3, 9, 1, 5, 5, 2, 7]))
