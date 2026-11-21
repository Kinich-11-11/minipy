rows = [('a', 1), ('b', 2), ('a', 3), ('b', 4), ('c', 5)]
totals = {}
for k, v in rows:
    if totals.get(k) == None:
        totals[k] = 0
    totals[k] = totals.get(k) + v
print(sorted(totals.items()))
print(max(totals.values()), min(totals.values()), sum(totals.values()))
