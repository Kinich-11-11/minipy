flag = True
a = [1]
b = (a if flag else [2])
b.append(9)
print(a, b)
flag = False
c = [5]
e = (c if flag else [7])
e.append(1)
print(c, e)
