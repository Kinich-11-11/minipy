import re
ms = list(re.finditer(r'(\d+)', 'x1 y22 z333'))
print([m[0] for m in ms if int(m[0]) > 10])
