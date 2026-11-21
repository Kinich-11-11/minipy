def g(x):
    x.append(1)
    x = [7]
    x.append(2)
lst = [0]
g(lst)
print(lst)
