def mk():
    a = [1]
    return a
a = mk()
c = mk()
c.append(2)
print(a, c)
