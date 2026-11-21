// mkreal3.mjs -- third round of multi-dimensional real-world suites:
//   _real3_hof  : higher-order functions / comprehensions × chained receivers
//   _real3_exc  : exceptions × new module objects / chains / formatting
//   _real3_pipe : cross-module pipelines with chained receivers
// Natural user code, direct print, compared verbatim against CPython.
import fs from 'fs';
const R = String.raw;

const hof = [
  { name: 'finditer_map_group', code: R`import re
print(list(map(lambda m: m.group(1), re.finditer(r"(\d+)-(\d+)", "12-34 56-78"))))` },
  { name: 'sorted_key_toordinal', code: R`import datetime
ds = [datetime.date(2024, 3, 1), datetime.date(2024, 1, 5), datetime.date(2024, 2, 2)]
print([d.isoformat() for d in sorted(ds, key=lambda d: d.toordinal())])` },
  { name: 'max_minus_min', code: R`import datetime
ds = [datetime.date(2024, 1, 5), datetime.date(2024, 3, 1)]
print(max(ds) - min(ds))` },
  { name: 'filter_timedelta_days', code: R`import datetime
ds = [datetime.date(2024, 1, 1), datetime.date(2024, 2, 1)]
print([d.isoformat() for d in ds if (datetime.date(2024, 2, 15) - d).days > 20])` },
  { name: 'genexp_chain_sum', code: R`import re
print(sum(m.end() - m.start() for m in re.finditer(r"\d+", "a12bb345c")))` },
  { name: 'comp_chain_groups', code: R`import re
print([m.group(1) for m in re.finditer(r"(\w+)=(\w+)", "a=1 b=2")])` },
  { name: 'dictcomp_chain', code: R`import re
print({m.group(1): m.group(2) for m in re.finditer(r"(\w+)=(\w+)", "a=1 b=2")})` },
  { name: 'fstring_bracket_chain', code: R`import datetime
d1 = datetime.date(2024, 1, 1)
d2 = datetime.date(2024, 3, 1)
print(f"{(d2 - d1).days} days")` },
  { name: 'join_genexp_iso', code: R`import datetime
ds = [datetime.date(2024, 1, 2), datetime.date(2024, 1, 1)]
print("|".join(d.isoformat() for d in sorted(ds)))` },
  { name: 'min_total_seconds', code: R`import datetime
print(min(datetime.timedelta(seconds=90), datetime.timedelta(minutes=1)).total_seconds())` },
  { name: 'lambda_default_date', code: R`import datetime
def shift(d, days=1):
    return d + datetime.timedelta(days=days)
print(shift(datetime.date(2024, 1, 1)).isoformat(), shift(datetime.date(2024, 1, 1), 3).isoformat())` },
  { name: 'any_genexp_group', code: R`import re
print(any(m.group(1) == "yes" for m in re.finditer(r"(\w+):", "a:no b:yes")))` },
  { name: 'dict_from_comp_iso', code: R`import datetime
ds = [datetime.date(2024, 1, 1), datetime.date(2024, 1, 2)]
print(len(dict([(d.isoformat(), d.toordinal()) for d in ds])))` },
  { name: 'nested_func_match', code: R`import re
def first(text):
    m = re.search(r"\d+", text)
    return m.group()
print(first("ab 42 cd"))` },
  { name: 'sort_key_lambda_group', code: R`import re
pairs = ["b=2", "a=1"]
print([m.group(1) for m in sorted(re.finditer(r"(\w+)=(\w+)", "b=2 a=1"), key=lambda m: m.group(1))])` },
  { name: 'map_chain_two_args', code: R`import re
print([m.group(2) for m in re.finditer(r"(\w+)=(\w+)", "x=10 y=20") if int(m.group(2)) > 15])` },
];

const exc = [
  { name: 'catch_valueerror_module', code: R`import datetime
try:
    datetime.date(2024, 2, 30)
    print("no")
except ValueError:
    print("caught")` },
  { name: 'exception_args', code: R`try:
    raise ValueError("bad", 42)
except ValueError as e:
    print(len(e.args), e.args[0])` },
  { name: 'exception_repr', code: R`print(repr(ValueError("boom")))` },
  { name: 'custom_exception_attr', code: R`class MyErr(Exception):
    pass
try:
    raise MyErr("custom")
except MyErr as e:
    print("got", e)` },
  { name: 'except_tuple', code: R`try:
    int("x")
except (ValueError, TypeError):
    print("either")` },
  { name: 'else_clause', code: R`try:
    v = int("7")
except ValueError:
    v = -1
else:
    v = v + 1
print(v)` },
  { name: 'finally_runs', code: R`def f():
    try:
        return "try"
    finally:
        print("finally")
print(f())` },
  { name: 're_sub_catch', code: R`import re
try:
    re.sub("(", "", "x")
except Exception:
    print("bad pattern")` },
  { name: 'keyerror_str', code: R`d = {"a": 1}
try:
    print(d["b"])
except KeyError as e:
    print("missing", e)` },
  { name: 'raise_from_catch_chain', code: R`import re
def safe_group(text):
    m = re.search(r"(\d+)", text)
    return m.group(1)
try:
    print(safe_group("abc"))
except Exception:
    print("no digits")` },
  { name: 'type_of_caught', code: R`try:
    {}["k"]
except Exception as e:
    print(type(e) == KeyError)` },
  { name: 'assert_message', code: R`def check(n):
    assert n > 0, "nonpositive"
    return n * 2
print(check(3))
try:
    check(-1)
except AssertionError as e:
    print("assert:", e)` },
  { name: 'exception_in_while', code: R`import datetime
n = 0
try:
    while True:
        datetime.date(2024, 1, 1 + n)
        n = n + 1
        if n > 40:
            break
except ValueError:
    print("stopped at", n)` },
  { name: 'nested_try_chain', code: R`import re
try:
    try:
        print(re.search(r"(\d+)", "abc").group(1))
    except AttributeError:
        print("inner")
except Exception:
    print("outer")` },
  { name: 'custom_init_exc', code: R`class Bad(Exception):
    def __init__(self, code):
        self.code = code
        Exception.__init__(self, code)
try:
    raise Bad(7)
except Bad as e:
    print(e.code, e)` },
  { name: 'str_of_caught_module', code: R`import datetime
try:
    datetime.date(2023, 13, 1)
except ValueError as e:
    print("month" in str(e))` },
];

const pipe = [
  { name: 're_stats_mean', code: R`import re, statistics
s = "3 14 15"
xs = [int(m.group()) for m in re.finditer(r"\d+", s)]
print(statistics.mean(xs))` },
  { name: 're_datetime_sort', code: R`import re, datetime
s = "2024-03-01 2024-01-05"
ds = [datetime.date.fromisoformat(m.group()) for m in re.finditer(r"\d{4}-\d{2}-\d{2}", s)]
print(sorted(d.isoformat() for d in ds))` },
  { name: 'chain_upper', code: R`import re
print(re.search(r"(\w+)@(\w+)", "me@here").group(2).upper())` },
  { name: 'sub_strip_title', code: R`import re
print(re.sub(r"\s+", " ", "  hello   world  ").strip().title())` },
  { name: 'polar_unpack', code: R`import cmath
r, phi = cmath.polar(1j)
print(round(r, 6), round(phi, 6))` },
  { name: 'func_returns_match', code: R`import re
def find(text):
    return re.search(r"\d+", text)
print(find("x 77").group())` },
  { name: 'dict_date_chain', code: R`import datetime
d = {"start": datetime.date(2024, 1, 15)}
print(d["start"].isoformat())` },
  { name: 'list_match_elem', code: R`import re
ms = list(re.finditer(r"\d+", "a1 b22"))
print(ms[0].group(), ms[1].group())` },
  { name: 'match_re_pattern', code: R`import re
m = re.search(r"\d+", "abc123")
print(m.re.pattern)` },
  { name: 'localtime_tm_year', code: R`import time
print(time.localtime().tm_year > 2020)` },
  { name: 'stat_pstdev_pipe', code: R`import random, statistics
random.seed(3)
xs = [random.randint(1, 9) for _ in range(5)]
print(round(statistics.pstdev(xs), 6) == round(statistics.pstdev(xs), 6))` },
  { name: 'td_format_fstring', code: R`import datetime
t = datetime.timedelta(hours=2, minutes=5)
print(f"{t}")` },
  { name: 'type_all_round', code: R`import datetime, re, time
print(type(datetime.date(2024, 1, 1)) == type(datetime.date(2025, 1, 1)))` },
  { name: 'bool_of_match', code: R`import re
m = re.search(r"\d+", "abc")
print(bool(m), m is None)` },
  { name: 'compile_use_chain', code: R`import re
p = re.compile(r"(\w+)!+")
m = p.search("hi!!!")
print(m.group(1), len(m.group(0)))` },
  { name: 'cross_module_chain_deep', code: R`import re, datetime, math
s = "2024-01-15 and 2024-02-20"
ds = [datetime.date.fromisoformat(m.group()) for m in re.finditer(r"\d{4}-\d{2}-\d{2}", s)]
gap = (ds[1] - ds[0]).days
print(gap, math.sqrt(gap) == 6.0)` },
];

const cpx = [
  { name: 'quadratic_tuple', code: R`import cmath

def solve_quadratic(a, b, c):
    d = cmath.sqrt(b**2 - 4*a*c)
    return (-b + d) / (2*a), (-b - d) / (2*a)

print(solve_quadratic(1, 2, 5))` },
  { name: 'quadratic_unpack', code: R`import cmath

def roots(a, b, c):
    d = cmath.sqrt(b**2 - 4*a*c)
    return (-b + d) / (2*a), (-b - d) / (2*a)

x, y = roots(1, 2, 5)
print(x, y)` },
  { name: 'complex_in_list', code: R`import cmath
print([cmath.sqrt(-4), cmath.sqrt(-9)])` },
  { name: 'complex_type_in_list', code: R`import cmath
xs = [cmath.sqrt(-4)]
print(type(xs[0]))` },
  { name: 'complex_arith_from_list', code: R`import cmath
xs = [cmath.sqrt(-4), cmath.sqrt(-9)]
print(xs[0] + xs[1], xs[0] * xs[1])` },
  { name: 'complex_in_dict', code: R`import cmath
d = {"r": cmath.sqrt(-4)}
print(d["r"], type(d["r"]))` },
  { name: 'complex_literal_tuple', code: R`print((1+2j, 3-4j))` },
  { name: 'complex_nested', code: R`import cmath
print([(cmath.sqrt(-4), 1)])` },
  { name: 'complex_attrs_from_list', code: R`import cmath
z = [1+2j][0]
print(z.real, z.imag, abs(z))` },
  { name: 'complex_sort_key', code: R`import cmath
zs = [cmath.sqrt(-4), cmath.sqrt(-1)]
print([abs(z) for z in zs])` },
  { name: 'complex_join_str', code: R`import cmath
xs = [cmath.sqrt(-4), cmath.sqrt(-9)]
print(", ".join(str(z) for z in xs))` },
  { name: 'complex_loop_sum', code: R`import cmath
total = 0
for z in [cmath.sqrt(-4), cmath.sqrt(-9)]:
    total = total + z
print(total)` },
];

const mk = (name, cases) => fs.writeFileSync(`_work/v41/_real3_${name}.json`, JSON.stringify(cases, null, 1));
mk('hof', hof);
mk('exc', exc);
mk('pipe', pipe);
mk('cpx', cpx);
console.log('written', hof.length, exc.length, pipe.length, cpx.length);
