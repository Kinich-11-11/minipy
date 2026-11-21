// mkprobe229e.cjs -- probe round 5
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'se', code: R`import re
m = re.search(r"(\d+)-(\d+)", "12-34")
print(m.start(1))
print(m.end(1))
print(m.start(2))
print(m.end(2))` },
  { name: 'list1', code: 'import datetime\nxs = [datetime.date(2024,1,10)]\nprint(xs)' },
  { name: 'list2', code: 'import datetime\nd = datetime.date(2024,1,10)\nxs = [d]\nprint(xs)' },
  { name: 'dsub_lit', code: 'import datetime\nprint(datetime.date(2024,1,15) - datetime.date(2024,1,10))' },
  { name: 'dadd_lit', code: 'import datetime\nprint(datetime.date(2024,1,15) + datetime.timedelta(days=1))' },
  { name: 'dsub_var', code: 'import datetime\na = datetime.date(2024,1,15)\nb = datetime.date(2024,1,10)\nprint(a - b)' },
  { name: 'dtd_sub', code: 'import datetime\nprint(datetime.date(2024,1,15) - datetime.timedelta(days=1))' },
  { name: 'subref', code: R`import re
print(re.sub(r"(\w+) (\w+)", r"\2 \1", "hello world"))` },
  { name: 'gtuple', code: R`import re
print(re.findall(r"(\d+)-(\d+)", "12-34 56-78"))` },
  { name: 'braces_rng', code: R`import re
print(re.findall(r"\d{2,3}", "1 12 345 6789"))` }
];
fs.writeFileSync('_work/v41/_probe229e.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
