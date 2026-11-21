print([c for c in 'abc'], list('abc'), len('abc'))
acc = ''
for c in 'xyz':
    acc = c + acc
print(acc)
