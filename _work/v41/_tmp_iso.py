hits = 0
for i in range(10000):
    if i % 3 == 0:
        continue
    if i == 9998:
        break
    hits += 1
print((hits, i))
