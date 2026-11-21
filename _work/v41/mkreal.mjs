// Generate realistic-usage suites: natural code, direct prints, exact CPython comparison.
import fs from 'fs';
const R = String.raw;
const w = (name, cases) => {
  if (cases.length !== 20) throw new Error(name + ' has ' + cases.length);
  fs.writeFileSync(name, JSON.stringify(cases, null, 1));
  console.log(name, cases.length);
};

w('_real_math.json', [
  { name: 'sqrt', code: R`import math
print(math.sqrt(2))
print(math.sqrt(16))` },
  { name: 'floor_ceil', code: R`import math
print(math.floor(3.7))
print(math.ceil(3.2))
print(math.floor(-3.7))` },
  { name: 'trunc_fabs', code: R`import math
print(math.trunc(3.7))
print(math.trunc(-3.7))
print(math.fabs(-3.5))` },
  // A-class (doc section 5): Scratch trig carries 10 decimals -- compare rounded values
  { name: 'sin', code: R`import math
print(math.sin(0) == 0.0)
print(round(math.sin(math.pi / 2), 10) == 1.0)
print(round(math.sin(1), 10) == 0.8414709848)` },
  { name: 'cos', code: R`import math
print(math.cos(0) == 1.0)
print(round(math.cos(math.pi), 10) == -1.0)
print(round(math.cos(1), 10) == 0.5403023059)` },
  { name: 'tan', code: R`import math
print(math.tan(0) == 0.0)
print(round(math.tan(1), 10) == 1.5574077247)` },
  { name: 'exp_log', code: R`import math
print(math.exp(0))
print(math.exp(1))
print(math.log(1))
print(math.log(2))` },
  { name: 'log10', code: R`import math
print(math.log10(100))
print(math.log10(1000))
print(math.log10(0.01))` },
  { name: 'pow_fmod', code: R`import math
print(math.pow(2, 10))
print(math.pow(2, 0.5))
print(math.fmod(7, 3))
print(math.fmod(-7, 3))` },
  { name: 'consts', code: R`import math
print(math.pi)
print(math.e)` },
  { name: 'hypot_expr', code: R`import math
print(math.sqrt(3 ** 2 + 4 ** 2))` },
  { name: 'identity', code: R`import math
print(round(math.sin(0.5) ** 2 + math.cos(0.5) ** 2, 10) == 1.0)` },
  { name: 'neg_floor', code: R`import math
print(math.floor(-2.5))
print(math.ceil(-2.5))` },
  { name: 'sqrt_domain', expectError: true, code: R`import math
print(math.sqrt(-1))` },
  { name: 'log_zero', expectError: true, code: R`import math
print(math.log(0))` },
  { name: 'from_import', code: R`from math import sin, pi
print(sin(pi / 2))` },
  { name: 'alias_import', code: R`import math as m
print(m.sqrt(9))` },
  { name: 'mixed', code: R`import math
print(math.floor(2.9) + 0.5)` },
  { name: 'neg_pow', code: R`import math
print(math.pow(2, -1))` },
  { name: 'nested', code: R`import math
print(math.sqrt(math.pow(2, 8)))` },
]);

w('_real_cmath.json', [
  // A-class (doc section 5): complex results agree with CPython to ~1e-10 (Scratch trig
  // carries 10 decimals) -- compare real/imag parts rounded to 8 decimals
  { name: 'sin', code: R`import cmath
z = 1 + 1j
r = cmath.sin(z)
print(round(r.real, 8) == 1.29845758, round(r.imag, 8) == 0.63496391)` },
  { name: 'cos', code: R`import cmath
z = 1 + 1j
r = cmath.cos(z)
print(round(r.real, 8) == 0.83373003, round(r.imag, 8) == -0.98889771)` },
  { name: 'tan', code: R`import cmath
z = 1 + 1j
r = cmath.tan(z)
print(round(r.real, 8) == 0.27175259, round(r.imag, 8) == 1.08392333)` },
  { name: 'asin', code: R`import cmath
z = 1 + 1j
r = cmath.asin(z)
print(round(r.real, 8) == 0.66623943, round(r.imag, 8) == 1.06127506)` },
  { name: 'acos', code: R`import cmath
z = 1 + 1j
r = cmath.acos(z)
print(round(r.real, 8) == 0.90455689, round(r.imag, 8) == -1.06127506)` },
  { name: 'atan', code: R`import cmath
z = 1 + 1j
r = cmath.atan(z)
print(round(r.real, 8) == 1.01722197, round(r.imag, 8) == 0.40235948)` },
  { name: 'sinh', code: R`import cmath
z = 1 + 1j
r = cmath.sinh(z)
print(round(r.real, 8) == 0.63496391, round(r.imag, 8) == 1.29845758)` },
  { name: 'cosh', code: R`import cmath
z = 1 + 1j
r = cmath.cosh(z)
print(round(r.real, 8) == 0.83373003, round(r.imag, 8) == 0.98889771)` },
  { name: 'tanh', code: R`import cmath
z = 1 + 1j
r = cmath.tanh(z)
print(round(r.real, 8) == 1.08392333, round(r.imag, 8) == 0.27175259)` },
  { name: 'asinh', code: R`import cmath
z = 1 + 1j
r = cmath.asinh(z)
print(round(r.real, 8) == 1.06127506, round(r.imag, 8) == 0.66623943)` },
  { name: 'acosh', code: R`import cmath
z = 1 + 1j
r = cmath.acosh(z)
print(round(r.real, 8) == 1.06127506, round(r.imag, 8) == 0.90455689)` },
  { name: 'atanh', code: R`import cmath
z = 1 + 1j
r = cmath.atanh(z)
print(round(r.real, 8) == 0.40235948, round(r.imag, 8) == 1.01722197)` },
  { name: 'sqrt', code: R`import cmath
print(cmath.sqrt(-1))
print(cmath.sqrt(-4))
r = cmath.sqrt(2 + 3j)
print(round(r.real, 8) == 1.67414923, round(r.imag, 8) == 0.89597748)` },
  { name: 'exp_log', code: R`import cmath
r = cmath.exp(1j)
print(round(r.real, 8) == 0.54030231, round(r.imag, 8) == 0.84147098)
print(cmath.log(-1))` },
  { name: 'polar', code: R`import cmath
print(cmath.polar(1 + 1j))` },
  { name: 'phase_rect', code: R`import cmath
print(cmath.phase(1 + 1j))
r = cmath.rect(2, cmath.pi / 4)
print(round(r.real, 8) == 1.41421356, round(r.imag, 8) == 1.41421356)` },
  { name: 'parts', code: R`z = 1 + 2j
print(z.real)
print(z.imag)` },
  { name: 'abs', code: R`print(abs(3 + 4j))` },
  { name: 'consts', code: R`import cmath
print(cmath.pi)
print(cmath.e)` },
  { name: 'bad_arg', expectError: true, code: R`import cmath
print(cmath.sqrt("x"))` },
]);

w('_real_random.json', [
  // C-class (doc section 5): MiniPy's PRNG is a documented 31-bit Lehmer generator, NOT
  // CPython's MT19937 -- seeded VALUES differ, so the tests assert reproducibility + shape
  { name: 'seed_randint', code: R`import random
random.seed(42)
a = random.randint(1, 100)
random.seed(42)
b = random.randint(1, 100)
print(a == b, 1 <= a <= 100)` },
  { name: 'seed_random', code: R`import random
random.seed(42)
a = random.random()
random.seed(42)
b = random.random()
print(a == b, 0 <= a < 1)` },
  { name: 'repro', code: R`import random
random.seed(7)
a = random.random()
random.seed(7)
b = random.random()
print(a == b)` },
  { name: 'randrange', code: R`import random
random.seed(1)
x = random.randrange(0, 10, 2)
random.seed(1)
y = random.randrange(0, 10, 2)
print(x == y, 0 <= x < 10, x % 2 == 0)` },
  { name: 'uniform', code: R`import random
random.seed(1)
a = random.uniform(1.0, 2.0)
random.seed(1)
b = random.uniform(1.0, 2.0)
print(a == b, 1.0 <= a <= 2.0)` },
  { name: 'choice', code: R`import random
random.seed(1)
xs = ['a', 'b', 'c']
print(random.choice(xs))` },
  { name: 'choices', code: R`import random
random.seed(1)
a = random.choices([1, 2, 3], k=5)
random.seed(1)
b = random.choices([1, 2, 3], k=5)
print(a == b, len(a))` },
  { name: 'sample', code: R`import random
random.seed(1)
a = random.sample([1, 2, 3, 4, 5], 3)
random.seed(1)
b = random.sample([1, 2, 3, 4, 5], 3)
print(a == b, len(a))` },
  { name: 'shuffle', code: R`import random
random.seed(1)
xs = [1, 2, 3, 4, 5]
random.shuffle(xs)
print(sorted(xs))` },
  { name: 'gauss', code: R`import random
random.seed(1)
a = random.gauss(0, 1)
random.seed(1)
b = random.gauss(0, 1)
print(a == b, abs(a) < 100)` },
  { name: 'getrandbits', code: R`import random
random.seed(1)
a = random.getrandbits(8)
random.seed(1)
b = random.getrandbits(8)
print(a == b, 0 <= a <= 255)` },
  { name: 'range_check', code: R`import random
x = random.random()
print(0 <= x < 1)` },
  { name: 'randint_bounds', code: R`import random
x = random.randint(1, 6)
print(1 <= x <= 6)` },
  { name: 'sample_zero', code: R`import random
print(random.sample([1, 2, 3], 0))` },
  { name: 'choices_empty', expectError: true, code: R`import random
print(random.choices([], k=2))` },
  { name: 'seed_str', code: R`import random
random.seed('abc')
a = random.random()
random.seed('abc')
b = random.random()
print(a == b)` },
  { name: 'shuffle_str', code: R`import random
random.seed(3)
xs = ['a', 'b', 'c']
random.shuffle(xs)
print(sorted(xs))` },
  { name: 'from_import', code: R`from random import randint
print(1 <= randint(1, 6) <= 6)` },
  { name: 'alias', code: R`import random as rnd
rnd.seed(5)
print(0 <= rnd.random() < 1)` },
  { name: 'randint_bad', expectError: true, code: R`import random
print(random.randint(5, 1))` },
]);

w('_real_time.json', [
  // C-class (doc section 5): Scratch has no UTC source -- time.time()/ctime() treat the
  // local wall clock as UTC, so absolute-epoch results shift by the zone offset (+08:00
  // here). Assert the timezone-invariant date part instead.
  { name: 'ctime0', code: R`import time
print(time.ctime(0)[:10])` },
  { name: 'ctime_day', code: R`import time
print(time.ctime(86400)[:10])` },
  { name: 'asctime_now', code: R`import time
print(len(time.asctime()))` },
  { name: 'strftime_date', code: R`import time
print(time.strftime("%Y-%m-%d"))` },
  { name: 'strftime_time', code: R`import time
print(time.strftime("%H:%M:%S"))` },
  { name: 'strftime_names', code: R`import time
print(time.strftime("%A %B %d %Y"))` },
  { name: 'strftime_yday', code: R`import time
print(time.strftime("%j"))` },
  { name: 'strftime_ampm', code: R`import time
print(time.strftime("%I %p"))` },
  { name: 'epoch_positive', code: R`import time
print(time.time() > 0)` },
  { name: 'ns_positive', code: R`import time
print(time.time_ns() > 0)` },
  { name: 'perf', code: R`import time
a = time.perf_counter()
b = time.perf_counter()
print(b >= a)` },
  { name: 'monotonic', code: R`import time
print(time.monotonic() >= 0)` },
  { name: 'process', code: R`import time
print(time.process_time() >= 0)` },
  { name: 'sleep_zero', code: R`import time
time.sleep(0)
print("done")` },
  { name: 'sleep_short', code: R`import time
time.sleep(0.01)
print("done")` },
  { name: 'ctime_len', code: R`import time
print(len(time.ctime()))` },
  { name: 'localtime', code: R`import time
t = time.localtime(0)
print(t.tm_yday, t.tm_wday, t.tm_mon, t.tm_mday)` },
  { name: 'gmtime', code: R`import time
print(time.gmtime(0))` },
  { name: 'alias', code: R`import time as t
print(len(t.ctime()))` },
  { name: 'from_import', code: R`from time import strftime
print(len(strftime("%Y")))` },
]);

w('_real_datetime.json', [
  { name: 'date_print', code: R`import datetime
print(datetime.date(2024, 1, 15))` },
  { name: 'date_attrs', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(d.year, d.month, d.day)` },
  { name: 'date_iso', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(d.isoformat())` },
  { name: 'date_fmt', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(d.strftime("%Y/%m/%d"))` },
  { name: 'datetime_print', code: R`import datetime
dt = datetime.datetime(2024, 1, 15, 10, 30, 45)
print(dt)` },
  { name: 'datetime_parts', code: R`import datetime
dt = datetime.datetime(2024, 1, 15, 10, 30, 45)
print(dt.hour, dt.minute, dt.second)` },
  { name: 'datetime_iso', code: R`import datetime
dt = datetime.datetime(2024, 1, 15, 10, 30, 45)
print(dt.isoformat())` },
  { name: 'td_print', code: R`import datetime
print(datetime.timedelta(2, 3661, 500))` },
  { name: 'td_kwargs', code: R`import datetime
print(datetime.timedelta(days=2, hours=3))` },
  { name: 'date_add', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(d + datetime.timedelta(days=1))` },
  { name: 'date_sub', code: R`import datetime
a = datetime.date(2024, 1, 15)
b = datetime.date(2024, 1, 10)
print(a - b)` },
  { name: 'today', code: R`import datetime
print(datetime.date.today().year > 2000)` },
  { name: 'weekday', code: R`import datetime
print(datetime.date(2024, 1, 15).weekday())` },
  { name: 'ordinal', code: R`import datetime
print(datetime.date(2024, 1, 15).toordinal())` },
  { name: 'compare', code: R`import datetime
a = datetime.date(2024, 1, 15)
b = datetime.date(2024, 1, 10)
print(a > b)` },
  { name: 'sort', code: R`import datetime
xs = [datetime.date(2024, 1, 15), datetime.date(2024, 1, 10)]
xs.sort()
print(xs)` },
  { name: 'fromiso', code: R`import datetime
print(datetime.date.fromisoformat("2024-01-15"))` },
  { name: 'invalid_date', expectError: true, code: R`import datetime
print(datetime.date(2024, 2, 30))` },
  { name: 'from_import', code: R`from datetime import date, timedelta
print(date(2024, 1, 15) + timedelta(days=1))` },
  { name: 'fmt_names', code: R`import datetime
d = datetime.date(2024, 1, 15)
print(d.strftime("%A %B"))` },
]);

w('_real_re.json', [
  { name: 'findall_digits', code: R`import re
print(re.findall(r"\d+", "a12 b345 c6"))` },
  { name: 'groups_search', code: R`import re
m = re.search(r"(\d+)-(\d+)", "12-34")
print(m.group(1))` },
  { name: 'match_group', code: R`import re
m = re.match(r"(\w+)@(\w+)", "alice@example")
print(m.group(2))` },
  { name: 'fullmatch_group', code: R`import re
m = re.fullmatch(r"\d{4}-\d{2}", "2024-01")
print(m.group(0))` },
  { name: 'sub_backref', code: R`import re
print(re.sub(r"(\w+) (\w+)", r"\2 \1", "hello world"))` },
  { name: 'split_group', code: R`import re
print(re.split(r"([,;])", "a,b;c"))` },
  { name: 'findall_groups', code: R`import re
print(re.findall(r"(\d+)-(\d+)", "12-34 56-78"))` },
  { name: 'nongreedy', code: R`import re
print(re.findall(r"<.+?>", "<a><b>"))` },
  { name: 'braces', code: R`import re
print(re.findall(r"\d{2,3}", "1 12 345 6789"))` },
  { name: 'word_boundary', code: R`import re
print(re.findall(r"\bcat\b", "cat concat cat"))` },
  { name: 'inline_flag', code: R`import re
print(re.findall(r"(?i)abc", "ABC abc"))` },
  { name: 'named_group', code: R`import re
m = re.search(r"(?P<year>\d{4})", "2024")
print(m.group("year"))` },
  { name: 'compile', code: R`import re
p = re.compile(r"\d+")
print(p.findall("a1b22"))` },
  { name: 'finditer', code: R`import re
for m in re.finditer(r"\d+", "a1b22"):
    print(m.group())` },
  { name: 'escape', code: R`import re
print(re.escape("a.b*c"))` },
  { name: 'classes', code: R`import re
print(re.findall(r"[a-c]+", "abc xyz"))` },
  { name: 'alternation', code: R`import re
print(re.findall(r"cat|dog", "cat dog bird"))` },
  { name: 'anchors', code: R`import re
print(re.search(r"^ab", "abc") is not None)` },
  { name: 'split_maxsplit', code: R`import re
print(re.split(r",", "a,b,c", 1))` },
  { name: 'sub_count', code: R`import re
print(re.sub(r"a", "X", "banana", 2))` },
]);
