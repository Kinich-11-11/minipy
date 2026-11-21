import re
x = re.search(r"(\d+)", "a1").group(1)
print(x)
