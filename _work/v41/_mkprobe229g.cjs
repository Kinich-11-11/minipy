// mkprobe229g.cjs -- chained module-call regression probe
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'chain_sub', code: R`import re
print(re.sub(r"\d+", "-", "a1b2").strip())` },
  { name: 'var_strip', code: R`import re
m = re.sub(r"\d+", "-", "a1b2")
print(m.strip())` },
  { name: 'chain_findall', code: R`import re
print(re.findall(r"\d+", "a1b22")[0])` },
  { name: 'chain_dt', code: R`import datetime
print(datetime.date(2024, 1, 15).isoformat())` },
  { name: 'plain_sub', code: R`import re
print(re.sub(r"\d+", "-", "a1b2"))` }
];
fs.writeFileSync('_work/v41/_probe229g.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
