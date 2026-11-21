def gr():
    yield 1
    return
    yield 2
print(list(gr()))
