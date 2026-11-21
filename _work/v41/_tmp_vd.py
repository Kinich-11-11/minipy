import re
m = re.search(r'(\w+)@(\w+)', 'user@site')
print(m[3])
