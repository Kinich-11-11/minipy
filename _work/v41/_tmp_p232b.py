import re
for m in re.finditer(r"\d+", "a1b22"):
    print(m.group())
