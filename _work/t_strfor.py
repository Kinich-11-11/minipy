word = 'Scratch'
count = 0
for ch in word:
    print(ch)
    count = count + 1
print(count)
for c in 'abc':
    print('[' + c + ']')
total = 0
for ch in '12345':
    total = total + int(ch)
print(total)
for x in range(1, 4):
    print('range ' + str(x))
s = 'hello'
vowels = 0
for c in s:
    if c == 'l':
        continue
    vowels = vowels + 1
print(vowels)
for c in s:
    if c == 'l':
        break
    print(c)
n = 0
for c in '':
    n = n + 1
print(n)
print('end')