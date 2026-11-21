data = ['apple', 'fig', 'banana', 'kiwi', 'plum']
r = list(map(lambda w: w.upper(), filter(lambda w: len(w) > 3, data)))
print(r)
print(sum(map(len, data)), max(len(w) for w in data))
