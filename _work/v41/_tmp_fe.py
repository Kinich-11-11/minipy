import re
s = re.sub(r"\s+", " ", "  a  b  ").strip()
print(s)
