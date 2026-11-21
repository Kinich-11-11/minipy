import_free = None
data = {'nums': [3, 1, 2], 'tags': ('x', 'y'), 'flag': True}
data['nums'].append(0)
data['nums'].sort()
print(data)
combined = []
for n in data['nums']:
    for t in data['tags']:
        combined.append(str(n) + t)
combined.sort()
print(combined)
print(len(combined), combined[0], combined[-1])
