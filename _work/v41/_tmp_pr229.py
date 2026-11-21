import re
m = re.fullmatch(r"\d{4}-\d{2}", "2024-01")
print(m.group(0))
