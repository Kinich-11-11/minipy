const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'map_chain_lit', code: R`import re
print(list(map(lambda m: m.group(1), [re.search(r"(\d)", "a1")])))` },
  { name: 'map_varfun_chain', code: R`import re
f = lambda m: m.group(1)
ms = list(re.finditer(r"(\d)", "a1b2"))
print(list(map(f, ms)))` },
  { name: 'map_attr_body', code: R`import re
print(list(map(lambda m: m.group, [re.search(r"(\d)", "a1")])))` },
  { name: 'dtcls_arg_strmeth', code: R`import datetime
print(datetime.date.fromisoformat("2024-01-05".upper()))` },
  { name: 'dtcls_arg_callfn', code: R`import datetime
print(datetime.date.fromisoformat(str(20240105)).isoformat())` },
  { name: 'dtcls_arg_var', code: R`import re, datetime
m = re.search(r"\d{4}-\d{2}-\d{2}", "2024-01-05")
g = m.group()
print(datetime.date.fromisoformat(g).isoformat())` },
  { name: 'dtfn_arg_chain', code: R`import re, datetime
m = re.search(r"(\d+)", "y2024")
print(datetime.date(int(m.group(1)), 1, 1).isoformat())` },
  { name: 'polar_1j', code: R`import cmath
print(cmath.polar(1j))` },
  { name: 'exc_instance_dump', code: R`try:
    raise ValueError("bad")
except ValueError as e:
    print(type(e), str(e))` },
];
fs.writeFileSync('_work/v41/_probe234c.json', JSON.stringify(cases, null, 1));
console.log('written');
