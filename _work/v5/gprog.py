def g():
    yield 1
    yield 2
for x in g():
    print(x)