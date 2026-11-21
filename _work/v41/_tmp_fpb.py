def outer():
    n=0
    def inc():
        nonlocal n
        n+=1
        return n
    return inc
g=outer()
print(g(), g())
