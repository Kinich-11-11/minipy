import re
ms = list(re.finditer(r'(\w+)@(\w+)', 'a@x b@y'))
print(list(map(lambda m: m[2], ms)))
