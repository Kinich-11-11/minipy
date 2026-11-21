class B:
    pass
b = B()
b.v = [1]
x = b.v
b.v = [9]
print(x, b.v)
