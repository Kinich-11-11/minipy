# regression: original features
name = 'Scratch'
print('Hello, ' + name)
total = 0
for i in range(1, 6):
    total = total + i
    print(total)
if total == 15:
    print('All checks passed')
else:
    print('Try again')
n = 3
while n > 0:
    print(n)
    n = n - 1
print('Done')
print(len('abcd'))
print(int('42') + 1)
print(float('1.5') * 2)
print(str(7) + 'x')
print(abs(-9))
print(round(2.6))
print(bool(''))
print(True)
print(False)
print(1 == 1)
print(2 > 1)
print(not 0)
print(3 % 2)
print(7 // 2)
print(2 * 3 + 4)
x = 5
x += 2
x -= 1
x *= 3
x /= 2
print(x)
print(5 > 3 and 1 < 2)
print(5 < 3 or 1 < 2)
items = 'abc'
print('b' in items)
for i in range(1, 3):
    if i == 1:
        continue
    print('second')
j = 0
while True:
    j = j + 1
    if j > 2:
        break
print(j)
pass
assert 1 == 1
del x
print('end')