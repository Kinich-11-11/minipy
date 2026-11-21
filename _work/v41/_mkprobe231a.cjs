// mkprobe231a.cjs -- mechanism probes for v4.231
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'binop2', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.toordinal() - d1.toordinal())` },
  { name: 'binop2_vars', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
x = d2.toordinal()
y = d1.toordinal()
print(x - y)` },
  { name: 'forloop_attr', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 5)]
for d in ds:
    print(d.day)` },
  { name: 'forloop_attr_cmp', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
for d in ds:
    if d.day > 10:
        print("big")` },
  { name: 'paren_chain', code: R`import datetime
a = datetime.date(2024, 3, 1)
b = datetime.date(2024, 2, 1)
print((a - b).days)` },
  { name: 'multi_import', code: R`import re, math
print(math.sqrt(4) > 1, len(re.findall(r"\d+", "a1")))` }
];
fs.writeFileSync('_work/v41/_probe231a.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
