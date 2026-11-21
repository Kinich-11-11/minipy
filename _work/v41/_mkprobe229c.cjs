// mkprobe229c.cjs -- probe round 3
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'findall_a', code: R`import re
print(re.findall(r"a", "banana"))` },
  { name: 'search_a', code: R`import re
m = re.search(r"a", "banana")
print(m)` },
  { name: 'findall_lit_x', code: R`import re
print(re.findall(r"ab", "abxab"))` },
  { name: 'sub_probe', code: R`import re
print(re.sub(r"b", "X", "banana"))` },
  { name: 'iflag_search', code: R`import re
m = re.search(r"(?i)a", "A")
print(m)` },
  { name: 'iflag_class', code: R`import re
print(re.findall(r"(?i)[a]+", "Aa"))` },
  { name: 'flag_var', code: R`import re
print(re.findall("a", "Aa", re.I))` },
  { name: 'esc_b', code: R`import re
m = re.search(r"\d", "x5")
print(m.group())` }
];
fs.writeFileSync('_work/v41/_probe229c.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
