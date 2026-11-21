def acc(v, buf=[]):
    buf.append(v)
    return buf
a = acc(1)
b = acc(2)
a.append(9)
print(a, b)
print(acc(3))
