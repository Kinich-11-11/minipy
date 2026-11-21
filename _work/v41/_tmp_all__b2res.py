def swp(a):
    t = (a[1], a[0])
    a[0], a[1] = t
lst = [1, 2]
swp(lst)
print(lst)
