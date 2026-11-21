// mkprobe232e.cjs -- minimal repros for the 5 remaining bug classes
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'multi_import', code: R`import re, math
print(math.sqrt(4), re.findall(r"\d", "a1"))` },
  { name: 'tup_elem_method', code: R`import datetime
e = ("b", datetime.date(2024, 1, 15))
print(e[1].isoformat())` },
  { name: 'tup_elem_method_loop', code: R`import datetime
evs = [("b", datetime.date(2024, 1, 15))]
for e in evs:
    print(e[1].isoformat())` },
  { name: 'u_attr_binop', code: R`import time
t = time.localtime(0)
print(t.tm_yday + t.tm_wday)` },
  { name: 'h_meth_binop', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.toordinal() - d1.toordinal())` },
  { name: 'cls_date_add', code: R`import datetime
class Shift:
    def __init__(self, d):
        self.d = d
    def plus(self, n):
        self.d = self.d + datetime.timedelta(days=n)
        return self.d
s = Shift(datetime.date(2024, 1, 30))
print(s.plus(1))` },
  { name: 'resub_strip', code: R`import re
def norm(s):
    return re.sub(r"\s+", " ", s).strip()
print(norm("  a   b  "))` },
  { name: 'resub_plain', code: R`import re
s = re.sub(r"\s+", " ", "  a  b  ")
print(s)` },
  { name: 'resub_chain_var', code: R`import re
s = re.sub(r"\s+", " ", "  a  b  ").strip()
print(s)` }
];
fs.writeFileSync('_work/v41/_probe232e.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
