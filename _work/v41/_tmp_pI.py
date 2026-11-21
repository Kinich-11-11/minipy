import re
ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))
print([m.group(2) for m in ms])
