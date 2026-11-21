// mkprobe231b.cjs -- narrow the binop-second-operand failure
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'both_year', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year - d1.year)` },
  { name: 'right_attr_only', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(100 - d1.year)` },
  { name: 'left_meth_right_year', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.toordinal() - d1.year)` },
  { name: 'left_year_right_meth', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year - d1.toordinal())` },
  { name: 'subscript_attr', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
print(ds[0].day)` },
  { name: 'subscript_attr_cmp', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
if ds[0].day > 10:
    print("big")` },
  { name: 'paren_chain_days', code: R`import datetime
a = datetime.date(2024, 3, 1)
b = datetime.date(2024, 2, 1)
print((a - b).days)` },
  { name: 'paren_chain_var', code: R`import datetime
a = datetime.date(2024, 3, 1)
b = datetime.date(2024, 2, 1)
td = a - b
print(td.days)` }
];
fs.writeFileSync('_work/v41/_probe231b.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
