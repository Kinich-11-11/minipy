// mkprobe232a.cjs -- the three "avoided" limitations, current behavior
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'type_td', code: R`import datetime
print(type(datetime.timedelta(days=1)))` },
  { name: 'type_date', code: R`import datetime
print(type(datetime.date(2024, 1, 15)))` },
  { name: 'type_match', code: R`import re
print(type(re.search(r"\d", "a1")))` },
  { name: 'type_pattern', code: R`import re
print(type(re.compile(r"\d")))` },
  { name: 'type_st', code: R`import time
print(type(time.localtime(0)))` },
  { name: 'type_cpx', code: R`print(type(1j))` },
  { name: 'chain_match_group', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"(\w+)=(\w+)")
    def first(self, text):
        return self.pat.search(text).group(1)
p = P()
print(p.first("color=red size=big"))` },
  { name: 'chain_finditer_group', code: R`import re
print(re.search(r"\d+", "a12b").group())` },
  { name: 'paren_bitlen', code: R`a = 5
b = 2
print((a - b).bit_length())` },
  { name: 'paren_str_upper', code: R`s = "hello"
print((s + "!").upper())` },
  { name: 'paren_str_strip', code: R`s = "  hi  "
print((" " + s + " ").strip())` },
  { name: 'sub_str_upper', code: R`ws = ["ab", "cd"]
print(ws[0].upper() + ws[1].upper())` },
  { name: 'lit_str_upper_base', code: R`print("ab".upper())` }
];
fs.writeFileSync('_work/v41/_probe232a.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
