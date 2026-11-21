// mkprobe229b.cjs -- probe round 2
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'd_w_var', code: 'import datetime\nd = datetime.date(2024, 1, 15)\nprint(d.weekday())' },
  { name: 'd_w_chain', code: 'import datetime\nprint(datetime.date(2024, 1, 15).weekday())' },
  { name: 'd_w_paren', code: 'import datetime\nprint((datetime.date(2024, 1, 15)).weekday())' },
  { name: 'd_sub_lit', code: 'import datetime\nprint(datetime.date(2024, 1, 15) - datetime.date(2024, 1, 10))' },
  { name: 'td_add', code: 'import datetime\nprint(datetime.timedelta(days=1) + datetime.timedelta(days=2))' },
  { name: 'td_add_var', code: 'import datetime\nt1 = datetime.timedelta(days=1)\nt2 = datetime.timedelta(days=2)\nprint(t1 + t2)' },
  { name: 'd_add_var', code: 'import datetime\ntd = datetime.timedelta(days=1)\nd = datetime.date(2024, 1, 15)\nprint(d + td)' },
  { name: 'g_start_end', code: R`import re
m = re.search(r"(\d+)-(\d+)", "12-34")
print(m.start(1))
print(m.end(1))
print(m.start(2))
print(m.end(2))
print(m.start(0), m.end(0))` },
  { name: 'g_simple', code: R`import re
m = re.search(r"(\d+)", "12")
print(m.group(1))` },
  { name: 'braces_x2', code: R`import re
print(re.findall(r"x{2}", "xx"))` },
  { name: 'braces_lit', code: R`import re
print(re.findall(r"a{2}", "xaa"))` },
  { name: 'iflag_simple', code: R`import re
print(re.findall(r"(?i)a", "Aa"))` },
  { name: 'rxp_findall', code: R`import re
p = re.compile(r"\d+")
q = p.findall("a1b22")
print(q)` },
  { name: 'rxp_search', code: R`import re
p = re.compile(r"\d+")
m = p.search("a1b22")
print(m.group())` },
  { name: 'sub_simple', code: R`import re
print(re.sub(r"a", "X", "banana"))` },
  { name: 'sub_once', code: R`import re
print(re.sub(r"a", "X", "banana", 1))` }
];
fs.writeFileSync('_work/v41/_probe229b.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
