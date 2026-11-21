def counter():
    global Z
    Z = [0]
    def inc():
        Z[0] += 1
        return Z[0]
    return inc
f = counter()
g = counter()
print(f(), f(), g(), g())
