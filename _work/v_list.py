a = [1, 2, 3]
print(a)
print(len(a))
print(a[0])
print(a[2])
print(a[-1])
b = ['x', 'y']
print(b)
print(b[1])
c = []
print(c)
print(len(c))
a.append(4)
print(a)
print(len(a))
print(a[3])
total = 0
for x in a:
    total = total + x
print(total)
for x in [10, 20, 30]:
    print(x)
print(sum(a))
print(str([1, 2]) + '!')
n = [5, 6, 7]
print(n[1] + n[2])
print(type([1, 2]))