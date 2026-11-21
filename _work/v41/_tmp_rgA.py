def g(n):
    if n > 0:
        yield n
print(list(g(3)))
