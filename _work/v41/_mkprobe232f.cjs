const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'tup_elem_type', code: R`import datetime
e = ("b", datetime.date(2024, 1, 15))
print(type(e[1]))` },
  { name: 'list_elem_method', code: R`import datetime
ws = [datetime.date(2024, 1, 15)]
print(ws[0].isoformat())` },
  { name: 'call_plus_lit', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(d1.toordinal() + 0)` },
  { name: 'lit_plus_call', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(0 + d1.toordinal())` },
  { name: 'assign_call', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
x = d1.toordinal()
print(x)` },
  { name: 'lit_plus_modfn', code: R`import math
x = 1 + math.sqrt(4)
print(x)` },
  { name: 'resub_2arg_chain', code: R`import re
s = re.sub(r"\s+", "-", "a b").upper()
print(s)` },
  { name: 'resub_1arg_chain', code: R`import re
s = re.findall(r"\d", "a1").__len__()
print(s)` },
  { name: 'search_group_chain_ok', code: R`import re
s = re.search(r"\d+", "a12").group()
print(s)` }
];
fs.writeFileSync('_work/v41/_probe232f.json', JSON.stringify(cases, null, 1));
console.log('written');
