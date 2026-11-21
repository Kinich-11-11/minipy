import re
print([m.group(2) for m in re.finditer(r'(\w)=(\d+)', 'x=7 y=8')])
print(sum(m.end() for m in re.finditer(r'\d+', 'a12b3')))
