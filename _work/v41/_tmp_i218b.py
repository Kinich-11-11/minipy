def g3():
    yield 1
    yield 2
print([x * 2 for x in g3()])
