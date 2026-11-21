def acc(x, box=[]):
    box.append(x)
    return box
a = acc(1)
a = [9]
b = acc(2)
print(a, b)
