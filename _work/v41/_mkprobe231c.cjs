// mkprobe231c.cjs -- multi-stop in one binop: old builtins vs new-type dispatches
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'len_len', code: 'print(len("ab") + len("cd"))' },
  { name: 'sqrt_sqrt', code: R`import math
print(math.sqrt(4) + math.sqrt(9))` },
  { name: 'ord_ord', code: 'print(ord("a") + ord("b"))' },
  { name: 'type_year_both', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.year - d1.year)` },
  { name: 'year_plus_lit', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(d1.year + 1)` },
  { name: 'lit_plus_year', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(1 + d1.year)` },
  { name: 'year_times_2', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
print(d1.year * 2)` },
  { name: 'two_statements', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
a = d2.year
b = d1.year
print(a - b)` }
];
fs.writeFileSync('_work/v41/_probe231c.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
