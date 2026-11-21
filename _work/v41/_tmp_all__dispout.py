import_free = None
data = {'nums': [3, 1, 2], 'tags': ('x', 'y'), 'flag': True}
data['nums'].append(0)
data['nums'].sort()
print(data)
combined = []
for t in data['tags']:
    combined.append(t + '!')
print(combined)
vals = list(data['nums']) + [len(combined)]
print(sum(vals), max(vals), min(vals))
