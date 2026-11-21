// mkprobe229d.cjs -- probe round 4: (?i) consumption vs flag setting
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'i_ab', code: R`import re
print(re.findall(r"(?i)ab", "AB"))` },
  { name: 'i_empty', code: R`import re
print(re.findall(r"(?i)", "AB"))` },
  { name: 'i_paren_only', code: R`import re
print(re.findall(r"(?i)(", "AB"))` },
  { name: 'i_sub', code: R`import re
print(re.sub(r"(?i)a", "X", "Aa"))` },
  { name: 'i_then_literal', code: R`import re
print(re.findall(r"x(?i)y", "Xy"))` }
];
fs.writeFileSync('_work/v41/_probe229d.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
