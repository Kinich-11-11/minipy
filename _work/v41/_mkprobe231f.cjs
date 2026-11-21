// mkprobe231f.cjs -- bracket roots + multi-import mechanism probes
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'paren_attr', code: R`import datetime
a = datetime.date(2024, 3, 1)
b = datetime.date(2024, 2, 1)
print((a - b).days)` },
  { name: 'paren_attr_in_def', code: R`import datetime
def days_between(a, b):
    return (a - b).days
print(days_between(datetime.date(2024, 3, 1), datetime.date(2024, 2, 1)))` },
  { name: 'sub_attr', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
print(ds[0].day)` },
  { name: 'sub_attr_binop', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 5)]
print(ds[0].day + ds[1].day)` },
  { name: 'paren_method', code: R`import datetime
a = datetime.datetime(2024, 3, 1, 10, 0, 0)
b = datetime.datetime(2024, 3, 1, 9, 30, 0)
print((a - b).total_seconds())` },
  { name: 'sub_method', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
print(ds[0].isoformat())` },
  { name: 'cpx_attr_var', code: R`import cmath
r = cmath.exp(cmath.pi * 1j)
print(round(r.real, 6) == -1.0)` },
  { name: 'import_two', code: R`import re, math
print(math.sqrt(4) > 1, len(re.findall(r"\d+", "a1")))` },
  { name: 'import_two_rev', code: R`import math, re
print(len(re.findall(r"\d+", "a1")), math.sqrt(9) > 2)` },
  { name: 'import_three', code: R`import re, math, datetime
print(len(re.findall(r"a", "aa")), math.floor(2.7), datetime.date(2024, 1, 15))` }
];
fs.writeFileSync('_work/v41/_probe231f.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
