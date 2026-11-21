import re
print(re.findall('a', 'AaA'))
print(re.findall('a', 'AaA', re.I))
print(re.search('ab', 'xABy') is None)
