flag = True
a = [1]
b = (a if flag else [2])
b.append(9)
print(a, b)
