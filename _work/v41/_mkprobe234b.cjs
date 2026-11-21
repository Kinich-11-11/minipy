const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'map_lambda_chain', code: R`import re
ms = list(re.finditer(r"(\d)", "a1b2"))
print(list(map(lambda m: m.group(1), ms)))` },
  { name: 'map_lambda_chain_direct', code: R`import re
print(list(map(lambda m: m.group(1), re.finditer(r"(\d)", "a1b2"))))` },
  { name: 'map_lambda_call', code: R`def g(x):
    return x * 2
print(list(map(lambda x: g(x), [1, 2])))` },
  { name: 'map_lambda_attr', code: R`class P:
    def __init__(self, v):
        self.v = v
xs = [P(1), P(2)]
print(list(map(lambda p: p.v, xs)))` },
  { name: 'fromiso_var_arg', code: R`import re, datetime
m = re.search(r"\d{4}-\d{2}-\d{2}", "2024-01-05")
d = m.group()
print(datetime.date.fromisoformat(d).isoformat())` },
  { name: 'fromiso_paren_arg', code: R`import re, datetime
m = re.search(r"\d{4}-\d{2}-\d{2}", "2024-01-05")
print(datetime.date.fromisoformat((m.group())).isoformat())` },
  { name: 'date_ctor_arg_chain', code: R`import re, datetime
m = re.search(r"(\d+)", "y2024")
print(datetime.date(int(m.group(1)), 1, 1).isoformat())` },
  { name: 'polar_direct', code: R`import cmath
print(cmath.polar(1j))` },
  { name: 'polar_index', code: R`import cmath
print(cmath.polar(1j)[0], cmath.polar(1j)[1] > 1.5)` },
  { name: 'exc_str_multi', code: R`try:
    raise ValueError("bad", 42)
except ValueError as e:
    print(e)` },
  { name: 'exc_type_name', code: R`try:
    raise ValueError("boom")
except ValueError as e:
    print(type(e))` },
  { name: 'sorted_finditer_lambda', code: R`import re
print(sorted([m.group(1) for m in re.finditer(r"(\w+)=(\w+)", "b=2 a=1")]))` },
];
fs.writeFileSync('_work/v41/_probe234b.json', JSON.stringify(cases, null, 1));
console.log('written');
