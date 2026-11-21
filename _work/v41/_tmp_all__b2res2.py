def swp(a):
    a[0], a[1] = a[1], a[0]
    print('in', a)
lst = [1, 2]
swp(lst)
print(lst, lst)
