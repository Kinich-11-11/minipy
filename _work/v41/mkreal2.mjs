// mkreal2.mjs -- multi-dimensional real-scenario suites: the v4.229 module
// capabilities (datetime / re Match / struct_time / complex / pattern objects)
// combined with other language features (functions, containers, formatting,
// classes, control flow, cross-module pipelines). Natural code, direct prints,
// exact CPython comparison; A/C classes follow the doc's section-5 criteria.
import fs from 'fs';
const R = String.raw;
const w = (name, cases) => {
  if (cases.length !== 16) throw new Error(name + ' has ' + cases.length);
  fs.writeFileSync(name, JSON.stringify(cases, null, 1));
  console.log(name, cases.length);
};

// ---- suite 1: 与函数/高阶函数结合 ----
w('_real2_func.json', [
  { name: 'func_days_between', code: R`import datetime
def days_between(a, b):
    return (a - b).days
print(days_between(datetime.date(2024, 3, 1), datetime.date(2024, 2, 1)))` },
  { name: 'func_find_dates', code: R`import re
def find_dates(text):
    return re.findall(r"\d{4}-\d{2}-\d{2}", text)
print(find_dates("on 2024-01-15 and 2024-02-20"))` },
  { name: 'func_pass_match', code: R`import re
def year_of(m):
    return m.group("y")
m = re.search(r"(?P<y>\d{4})", "in 2024 we")
print(year_of(m))` },
  { name: 'func_pass_pattern', code: R`import re
def grab(pat, text):
    m = pat.search(text)
    return m.group()
pat = re.compile(r"\d+")
print(grab(pat, "x42y"))` },
  { name: 'func_add_days', code: R`import datetime
def add_days(d, n):
    return d + datetime.timedelta(days=n)
print(add_days(datetime.date(2024, 1, 31), 1))` },
  { name: 'func_return_match', code: R`import re
def first_word(text):
    return re.search(r"\w+", text)
m = first_word("  hello world")
print(m.group(), m.start())` },
  { name: 'sorted_dates', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 10), datetime.date(2023, 12, 1)]
print(sorted(ds))` },
  { name: 'min_max_dates', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 10)]
print(min(ds))
print(max(ds))` },
  { name: 'sorted_key_lambda', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2023, 5, 4)]
print(sorted(ds, key=lambda d: d.toordinal(), reverse=True))` },
  { name: 'map_lambda_year', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2023, 5, 4)]
print(list(map(lambda d: d.year, ds)))` },
  { name: 'filter_dates', code: R`import datetime
ds = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 5)]
big = []
for d in ds:
    if d.day > 10:
        big.append(d)
print(len(big), big[0].day)` },
  { name: 'comprehension_finditer', code: R`import re
print([m.group() for m in re.finditer(r"\d+", "a1b22c333")])` },
  { name: 'comprehension_starts', code: R`import re
print([m.start() for m in re.finditer(r"\d+", "a1b22")])` },
  { name: 'genexp_sum_matches', code: R`import re
print(sum(int(m.group()) for m in re.finditer(r"\d+", "3 4 5")))` },
  { name: 'func_match_chain', code: R`import re
def norm(s):
    return re.sub(r"\s+", " ", s).strip()
print(norm("  a   b  c  "))` },
  { name: 'func_timedelta_bool', code: R`import datetime
def is_future(d):
    return d > datetime.date(2024, 1, 1)
print(is_future(datetime.date(2024, 6, 1)), is_future(datetime.date(2023, 6, 1)))` },
]);

// ---- suite 2: 与容器/格式化/字典结合 ----
w('_real2_container.json', [
  { name: 'dict_date_value', code: R`import datetime
rec = {"when": datetime.date(2024, 1, 15), "who": "ann"}
print(rec["when"])` },
  { name: 'dict_key_loop', code: R`import datetime
rec = {"when": datetime.date(2024, 1, 15), "who": "ann"}
ks = []
for k in rec:
    ks.append(k)
print(ks[0], ks[1])` },
  { name: 'sorted_timedeltas', code: R`import datetime
xs = [datetime.timedelta(hours=5), datetime.timedelta(days=1), datetime.timedelta(hours=1)]
print(sorted(xs))` },
  { name: 'sum_timedeltas', code: R`import datetime
xs = [datetime.timedelta(days=1), datetime.timedelta(hours=5)]
t = xs[0] + xs[1]
print(t)` },
  { name: 'fstring_date', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(f"day={d.day} month={d.month}")` },
  { name: 'fstring_iso', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(f"iso={d.isoformat()}")` },
  { name: 'fstring_timedelta', code: R`import datetime
td = datetime.timedelta(minutes=90)
print(f"{td}")` },
  { name: 'pct_format_date', code: R`import datetime
d = datetime.date(2024, 1, 15)
print("%04d-%02d" % (d.year, d.month))` },
  { name: 'format_call', code: R`import datetime
d = datetime.date(2024, 1, 15)
print("{} days in {}-{}".format(d.day, d.year, d.month))` },
  { name: 'str_repr_date', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(str(d))
print(repr(d))` },
  { name: 'repr_timedelta', code: R`import datetime
print(repr(datetime.timedelta(days=2, seconds=61)))` },
  { name: 'tuple_pack_date', code: R`import datetime
d = datetime.date(2024, 1, 15)
pair = (d, d.weekday())
print(pair[1])` },
  { name: 're_word_counter', code: R`import re
counts = {}
for w in re.findall(r"\w+", "a b a c a"):
    counts[w] = counts.get(w, 0) + 1
print(counts["a"], counts["b"], counts["c"])` },
  { name: 'join_genexp', code: R`import re
print("-".join(m.group() for m in re.finditer(r"\d+", "x1y2")))` },
  { name: 'struct_time_math', code: R`import time
t = time.localtime(0)
print(t.tm_yday + t.tm_wday)` },
  { name: 'nested_list_dates', code: R`import datetime
rows = [[datetime.date(2024, 1, 15)], [datetime.date(2024, 1, 10)]]
print(rows[0][0])
print(sorted(rows[0]))` },
]);

// ---- suite 3: 与类/控制流/跨模块结合 ----
w('_real2_cross.json', [
  { name: 'class_holds_date', code: R`import datetime
class Event:
    def __init__(self, name, day):
        self.name = name
        self.day = day
    def when(self):
        return self.day.isoformat()
e = Event("launch", datetime.date(2024, 3, 1))
print(e.when())` },
  // NOTE: the pattern is fetched into a local first -- chaining a method call directly
  // onto a Match returned by an expression (`self.pat.search(s).group(1)`) is a documented
  // limitation (expression-result method chaining), not exercised here.
  { name: 'class_returns_match', code: R`import re
class Parser:
    def __init__(self):
        self.pat = re.compile(r"(\w+)=(\w+)")
    def first(self, text):
        m = self.pat.search(text)
        return m.group(1)
p = Parser()
print(p.first("color=red size=big"))` },
  { name: 'class_chain_dates', code: R`import datetime
class Shift:
    def __init__(self, d):
        self.d = d
    def plus(self, n):
        self.d = self.d + datetime.timedelta(days=n)
        return self
    def iso(self):
        return self.d.isoformat()
s = Shift(datetime.date(2024, 1, 30))
print(s.plus(1).plus(1).iso())` },
  { name: 'try_bad_date', code: R`import datetime
try:
    datetime.date(2024, 2, 30)
except ValueError:
    print("bad date")` },
  { name: 'while_month_step', code: R`import datetime
d = datetime.date(2024, 1, 29)
n = 0
while d.month == 1:
    d = d + datetime.timedelta(days=1)
    n = n + 1
print(d, n)` },
  { name: 'datetime_diff_parts', code: R`import datetime
a = datetime.datetime(2024, 1, 15, 10, 0, 0)
b = datetime.datetime(2024, 1, 15, 12, 30, 0)
d = b - a
print(d.days, d.seconds)
print(d.seconds // 3600, (d.seconds % 3600) // 60)` },
  { name: 'random_stat_shape', code: R`import random, statistics
random.seed(1)
xs = []
for i in range(5):
    xs.append(random.randint(1, 10))
random.seed(1)
ys = []
for i in range(5):
    ys.append(random.randint(1, 10))
print(xs == ys, len(xs), min(xs) >= 1, max(xs) <= 10)
print(statistics.mean(xs) == statistics.mean(ys))` },
  { name: 're_extract_numbers', code: R`import re, math
def numbers(text):
    return [int(m.group()) for m in re.finditer(r"\d+", text)]
xs = numbers("3 14 5")
print(xs, math.sqrt(xs[1]) > 3)` },
  { name: 'cmath_abs_unit', code: R`import cmath
z = cmath.sqrt(-1)
print(round(abs(z), 6) == 1.0)
r = cmath.exp(cmath.pi * 1j)
print(round(r.real, 6) == -1.0)` },
  { name: 'time_year_gate', code: R`import time
now = time.localtime()
print(now.tm_year > 2000, now.tm_yday >= 1)` },
  { name: 're_groups_tuple_sum', code: R`import re
pairs = re.findall(r"(\d+)x(\d+)", "3x4 5x6")
print(pairs)
t = 0
for a, b in pairs:
    t = t + int(a) * int(b)
print(t)` },
  { name: 'date_ordinal_range', code: R`import datetime
d1 = datetime.date(2024, 1, 15)
d2 = datetime.date(2024, 2, 15)
print(d2.toordinal() - d1.toordinal())` },
  { name: 'match_in_bool_logic', code: R`import re
m = re.search(r"(\d+)", "abc123")
ok = m is not None and int(m.group(1)) > 100
print(ok)` },
  { name: 'strftime_in_fstring', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(f"today={d.strftime('%Y/%m/%d')}")` },
  { name: 'sort_mixed_keys', code: R`import datetime
evs = [("b", datetime.date(2024, 1, 15)), ("a", datetime.date(2024, 2, 1))]
names = []
for e in evs:
    names.append(e[0] + ":" + e[1].isoformat())
print(names)` },
  { name: 'count_lines_regex', code: R`import re
lines = ["err: disk", "ok: net", "err: mem"]
errs = []
for ln in lines:
    m = re.match(r"err: (.+)", ln)
    if m:
        errs.append(m.group(1))
print(len(errs), errs)` },
]);
console.log('done');
