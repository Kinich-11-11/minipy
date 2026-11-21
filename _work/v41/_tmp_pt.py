import re
ms = list(re.finditer(r'(w+)@(w+)', 'a@x b@y'))
print([m[2] for m in ms])
