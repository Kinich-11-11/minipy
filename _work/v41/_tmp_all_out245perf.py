d = {}
for i in range(500):
    d[str(i)] = i*i
s = 0
for i in range(500):
    s += d[str(i)]
print(len(d),s)
