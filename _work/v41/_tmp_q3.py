import re, datetime, math
s = "2024-01-15 and 2024-02-20"
ds = [datetime.date.fromisoformat(m.group()) for m in re.finditer(r"\d{4}-\d{2}-\d{2}", s)]
gap = (ds[1] - ds[0]).days
print(gap, math.sqrt(gap) == 6.0)
