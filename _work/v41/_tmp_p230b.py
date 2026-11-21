def h(x):
    return x + 100

def g():
    for i in range(3):
        yield h(i)

print(list(g()))
