def r4(n):
    acc = []
    if n > 1:
        for j in range(2):
            acc.append(j)
            r4(n - 1)
    return acc
print(r4(2))
