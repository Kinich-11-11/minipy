line = 'name,age,city'
rows = 'ann,3,paris;bob,7,rome;cy,1,nyc'
recs = []
for r in rows.split(';'):
    f = r.split(',')
    recs.append({'name': f[0], 'age': int(f[1]), 'city': f[2]})
for rec in recs:
    print(rec['name'], rec['age'], rec['city'])
ages = [r['age'] for r in recs]
print(sum(ages), max(ages), min(ages))
