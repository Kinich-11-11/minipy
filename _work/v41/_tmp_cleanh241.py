import re
print([m.group(2) for m in re.finditer(r"(\w+)=(\w+)", "x=10 y=20") if int(m.group(2)) > 15])
