s = 'Hello World'
print('Hello' in s)
print('hello' in s)
print('WORLD' in s)
print('World' in s)
print('z' not in s)
print('Z' not in s)
print('' in s)
print('' not in s)
print('a' in 'abc')
print('A' in 'abc')
print('A' not in 'abc')
print('bc' in 'abc')
print('cb' in 'abc')
word = 'MiniPy'
big = 0
for ch in word:
    if ch not in 'abcdefghijklmnopqrstuvwxyz':
        big = big + 1
print(big)
print('done')