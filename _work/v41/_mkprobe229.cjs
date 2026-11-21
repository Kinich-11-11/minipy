// mkprobe229.cjs -- write the probe suite for v4.229 debugging
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'td_kw', code: 'import datetime\nprint(datetime.timedelta(days=1))' },
  { name: 'd_sub', code: 'import datetime\na = datetime.date(2024, 1, 15)\nb = datetime.date(2024, 1, 10)\nprint(a - b)' },
  { name: 'd_add', code: 'import datetime\na = datetime.date(2024, 1, 15)\nprint(a + datetime.timedelta(days=1))' },
  { name: 'd_weekday', code: 'import datetime\nprint(datetime.date(2024, 1, 15).weekday())' },
  { name: 'd_ordinal', code: 'import datetime\nprint(datetime.date(2024, 1, 15).toordinal())' },
  { name: 'd_sort', code: 'import datetime\nxs = [datetime.date(2024, 1, 10)]\nprint(xs[0])' },
  { name: 'rx_g0', code: R`import re
m = re.search(r"(\d+)-(\d+)", "12-34")
print(m.group(0))
print(m.group(1))
print(m.group(2))` },
  { name: 'rx_braces', code: R`import re
print(re.findall(r"\d{2}", "12 34"))` },
  { name: 'rx_braces_rng', code: R`import re
print(re.findall(r"\d{2,3}", "1 12 345 6789"))` },
  { name: 'rx_compile', code: R`import re
p = re.compile(r"\d+")
print(p.findall("a1b22"))` },
  { name: 'rx_sub_count', code: R`import re
print(re.sub(r"a", "X", "banana", 2))` },
  { name: 'rx_named', code: R`import re
m = re.search(r"(?P<y>\d+)", "123")
print(m.group("y"))` },
  { name: 'rx_finditer', code: R`import re
for m in re.finditer(r"\d+", "a1b22"):
    print(m.group())` },
  { name: 'rx_wordb', code: R`import re
print(re.findall(r"\bcat\b", "cat concat cat"))` },
  { name: 'rx_iflag', code: R`import re
print(re.findall(r"(?i)abc", "ABC abc"))` },
  { name: 'rx_subref', code: R`import re
print(re.sub(r"(\w+) (\w+)", r"\2 \1", "hello world"))` },
  { name: 'rx_gtuple', code: R`import re
print(re.findall(r"(\d+)-(\d+)", "12-34 56-78"))` },
  { name: 'rx_fullm', code: R`import re
m = re.fullmatch(r"\d{4}-\d{2}", "2024-01")
print(m.group(0))` }
];
fs.writeFileSync('_work/v41/_probe229.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
