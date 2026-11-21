const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'lambda_chain_body', code: R`import re
f = lambda m: m.group(1)
print(f(re.search(r"(\d+)", "x9")))` },
  { name: 'lambda_plain_body', code: R`f = lambda x: x + 1
print(f(1))` },
  { name: 'map_lambda', code: R`print(list(map(lambda x: x + 1, [1, 2])))` },
  { name: 'fromiso_arg_chain', code: R`import re, datetime
m = re.search(r"\d{4}-\d{2}-\d{2}", "2024-01-05")
print(datetime.date.fromisoformat(m.group()).isoformat())` },
  { name: 'fromiso_arg_plain', code: R`import datetime
print(datetime.date.fromisoformat("2024-01-05").isoformat())` },
  { name: 'modfn_arg_chain', code: R`import re, math
m = re.search(r"\d+", "x16")
print(math.sqrt(int(m.group())))` },
  { name: 'call_root_chain', code: R`import datetime
print(min(datetime.timedelta(seconds=90), datetime.timedelta(minutes=1)).total_seconds())` },
  { name: 'match_re_attr', code: R`import re
m = re.search(r"\d+", "abc")
print(type(m.re) == type(m))` },
  { name: 'pattern_attr', code: R`import re
p = re.compile(r"\d+")
print(p.pattern)` },
  { name: 'exc_args_one', code: R`try:
    raise ValueError("bad")
except ValueError as e:
    print(e.args)` },
  { name: 'exc_args_multi', code: R`try:
    raise ValueError("bad", 42)
except ValueError as e:
    print(e.args)` },
  { name: 'round_float', code: R`print(round(1.0, 6))` },
  { name: 'round_float_230', code: R`print(round(2.0, 3), round(1.5, 0))` },
];
fs.writeFileSync('_work/v41/_probe234.json', JSON.stringify(cases, null, 1));
console.log('written');
