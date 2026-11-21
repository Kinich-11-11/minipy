// mkprobe231g.cjs -- what does a paren/script span evaluate to?
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'paren_num', code: R`a = 5
b = 2
print((a - b))
print(type((a - b)))` },
  { name: 'paren_num_attr', code: R`a = 5
b = 2
print((a - b).bit_length())` },
  { name: 'paren_date', code: R`import datetime
a = datetime.date(2024, 3, 1)
b = datetime.date(2024, 2, 1)
print(a - b)
print(type(a - b))
print((a - b))` },
  { name: 'sub_plain', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
print(ds[0])` },
  { name: 'sub_str', code: R`ws = ["ab", "cd"]
print(ws[0].upper())` },
  { name: 'sub_date_attr', code: R`import datetime
ds = [datetime.date(2024, 1, 15)]
print(ds[0].day)` },
  { name: 'import_re_math_pi', code: R`import re, math
print(math.pi > 3)` },
  { name: 'import_dt_math', code: R`import datetime, math
print(math.sqrt(16))` },
  { name: 'import_re_st_time', code: R`import re, statistics, time
print(len(re.findall(r"a", "aa")))` },
  { name: 'import_math_re_time', code: R`import math, re, time
print(len(re.findall(r"a", "aa")), math.floor(2.7))` }
];
fs.writeFileSync('_work/v41/_probe231g.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
