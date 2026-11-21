// mkprobe231d.cjs -- behavioral bisection for the binop second-operand failure
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'same_var', code: R`import datetime
d1 = datetime.date(2024, 2, 15)
print(d1.year - d1.year)` },
  { name: 'left_attr_lit', code: R`import datetime
d2 = datetime.date(2024, 2, 15)
print(d2.year - 2024)` },
  { name: 'two_vars_years', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year - d1.year)` },
  { name: 'cache_first', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
y1 = d1.year
print(d2.year - y1)` },
  { name: 'month_minus_day', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.month - d1.day)` },
  { name: 'add_both', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year + d1.year)` },
  { name: 'cmp_both', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year > d1.year)` }
];
fs.writeFileSync('_work/v41/_probe231d.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
