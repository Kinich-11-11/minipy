import fs from 'fs';
const R = String.raw;
const cases = [
  { name: 'exact', code: R`import re
raw = " Hello, World!! 2024"
clean = re.sub(r"[^A-Za-z0-9]+", " ",raw).strip()
print(clean)` },
  { name: 'raw_regex', code: R`import re
print(re.findall(r"\d+", "a12 b345"))` },
  { name: 'raw_slash', code: R`print(r"a\\b")` },
  { name: 'raw_quote', code: R`print(r'a"b')` },
  { name: 'raw_tab', code: R`print(r"tab\t")` },
  { name: 'raw_empty', code: R`print(r"")
print('ok')` },
  { name: 'raw_unclosed', expectError: true, code: R`print(r"abc)` },
  { name: 'normal_escape', code: R`print('a\\d')` },
  { name: 'r_var', code: R`r = 5
print(r + 1)` },
  { name: 'fstring_ok', code: R`x = 3
print(f"v={x}")` },
  { name: 'raw_single', code: R`import re
print(re.sub(r'[0-9]+', '#', 'a1b22'))` },
  { name: 'raw_paren', code: R`print(r"(x|y)+")` },
];
fs.writeFileSync('_probe_raw.json', JSON.stringify(cases, null, 1));
console.log('wrote', cases.length);
