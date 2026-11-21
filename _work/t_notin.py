s = 'hello world'
if 'world' in s:
    print('has world')
if 'xyz' not in s:
    print('no xyz')
if 'hello' not in s:
    print('BAD')
else:
    print('has hello')
n = 5
if n not in '1234567890':
    print('not a digit char')
else:
    print('n is in digits')
total = 0
for ch in '12345':
    if ch not in '135':
        continue
    total = total + int(ch)
print(total)
print('a' in 'abc')
print('z' in 'abc')
print('z' not in 'abc')
i = 0
while i not in '012':
    print('loop')
    i = i + 1
print('end')