# new features
a, b = 10, 20
a, b = b, a
print(a)
print(b)
p = q = 5
print(p + q)
x, y, z = 1, 2, 3
print(x + y + z)
s = 'Python'
print(s[0])
print(s[-1])
print(s[0:3])
print(s[3:])
print(s[:2])
print(s[-2:])
print(s[2:100])
print(len(s))
n = 2
print(s[n])
print(s[n + 1])
print(s[n * 2])
count = 0
for ch in s:
    count = count + 1
print(count)
v = 0
for ch in 'Scratch':
    if ch not in 'aeiou':
        v = v + 1
print(v)
print(max(4, 9))
print(min(4, 9))
print(pow(3, 3))
print(pow(2, -1))
print(round(1.2345, 3))
print(ord('Z'))
print(chr(122))
print('ell' in s)
print('zzz' not in s)
if 'tho' in s:
    print('yes')
if 'xyz' not in s:
    print('ok')
total = 0
for d in '1234':
    total = total + int(d)
print(total)
print(str(max(a, b)) + '!')