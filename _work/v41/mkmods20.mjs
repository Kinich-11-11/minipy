// Generate the seven 20-case module suites (additive to _mods_*.json).
import fs from 'fs';
const R = String.raw;
const w = (name, cases) => {
  if (cases.length !== 20) throw new Error(name + ' has ' + cases.length + ' cases');
  fs.writeFileSync(name, JSON.stringify(cases, null, 1));
  console.log(name, cases.length);
};

w('_mods20_math.json', [
  { name: 'floor', code: R`import math
print(math.floor(3.7))
print(math.floor(-3.7))
print(math.floor(5))` },
  { name: 'ceil', code: R`import math
print(math.ceil(3.2))
print(math.ceil(-3.2))
print(math.ceil(5))` },
  { name: 'trunc', code: R`import math
print(math.trunc(3.7))
print(math.trunc(-3.7))
print(math.trunc(-0.9))` },
  { name: 'fabs', code: R`import math
print(math.fabs(-3))
print(math.fabs(-3.5))
print(math.fabs(2))` },
  { name: 'sqrt', code: R`import math
print(math.sqrt(16))
print(math.sqrt(2))
print(math.sqrt(0.25))` },
  { name: 'exp', code: R`import math
print(math.exp(0))
print(math.exp(1))` },
  { name: 'log', code: R`import math
print(math.log(1))
print(math.log(2))
print(math.log(math.e))` },
  { name: 'log10', code: R`import math
print(math.log10(100))
print(math.log10(1000))
print(math.log10(0.01))` },
  { name: 'trig_zero', code: R`import math
print(math.sin(0))
print(math.cos(0))
print(math.tan(0))` },
  { name: 'sin_rad', code: R`import math
print(round(math.sin(math.pi / 2), 10) == 1.0)
print(round(math.sin(1), 10) == 0.8414709848)` },
  { name: 'cos_rad', code: R`import math
print(round(math.cos(math.pi), 10) == -1.0)
print(round(math.cos(1), 10) == 0.5403023059)` },
  { name: 'tan_rad', code: R`import math
print(round(math.tan(1), 10) == 1.5574077247)` },
  { name: 'pow', code: R`import math
print(math.pow(2, 10))
print(math.pow(2, 0.5))
print(math.pow(2, -1))` },
  { name: 'fmod_pos', code: R`import math
print(math.fmod(7, 3))
print(math.fmod(8.5, 2))` },
  { name: 'fmod_neg', code: R`import math
print(math.fmod(-7, 3))
print(math.fmod(7, -3))` },
  { name: 'const', code: R`import math
print(math.pi)
print(math.e)
print(math.pi > 3.14)` },
  { name: 'results', code: R`import math
print(math.floor(2.9) == 2)
print(math.ceil(2.1) == 3)
print(math.trunc(-2.9) == -2)
print(math.floor(2.9) * 2)` },
  { name: 'domain', expectError: true, code: R`import math
print(math.sqrt(-1))` },
  { name: 'log_zero', expectError: true, code: R`import math
print(math.log(0))` },
  { name: 'from', code: R`from math import sqrt, pi
print(sqrt(9))
print(pi > 3.14)` },
]);

w('_mods20_cmath.json', [
  { name: 'sqrt_neg1', code: R`import cmath
print(cmath.sqrt(-1))` },
  { name: 'sqrt_neg4', code: R`import cmath
print(cmath.sqrt(-4))` },
  { name: 'sqrt_pos', code: R`import cmath
print(cmath.sqrt(4))` },
  { name: 'sqrt_irr', code: R`import cmath
print(cmath.sqrt(2))` },
  { name: 'exp', code: R`import cmath
print(cmath.exp(0))
print(cmath.exp(1))` },
  { name: 'log1', code: R`import cmath
print(cmath.log(1))` },
  { name: 'log_neg', code: R`import cmath
print(cmath.log(-1))` },
  { name: 'log10', code: R`import cmath
p = cmath.polar(cmath.log10(100))
print(round(p[0], 6))
print(round(p[1], 6))` },
  { name: 'sin_zero', code: R`import cmath
print(cmath.sin(0))` },
  { name: 'sin_one', code: R`import cmath
p = cmath.polar(cmath.sin(1))
print(round(p[0], 6))
print(round(p[1], 6))` },
  { name: 'cos', code: R`import cmath
p = cmath.polar(cmath.cos(0))
print(p[0] == 1.0)
q = cmath.polar(cmath.cos(cmath.pi))
print(q[0] == 1.0)` },
  { name: 'tan_zero', code: R`import cmath
print(cmath.tan(0))` },
  { name: 'asin', code: R`import cmath
print(cmath.asin(0.5))` },
  { name: 'acos', code: R`import cmath
p = cmath.polar(cmath.acos(0.5))
print(round(p[0], 6))` },
  { name: 'atan', code: R`import cmath
p = cmath.polar(cmath.atan(0.5))
print(round(p[0], 6))` },
  { name: 'hyper', code: R`import cmath
print(cmath.sinh(0))
print(cmath.cosh(0))
print(cmath.tanh(0))` },
  { name: 'phase', code: R`import cmath
print(cmath.phase(1))
print(cmath.phase(-1))` },
  { name: 'polar', code: R`import cmath
p = cmath.polar(2)
print(p[0] == 2.0)
print(p[1] == 0.0)` },
  { name: 'rect', code: R`import cmath
print(cmath.rect(2, 0))` },
  { name: 'misc', code: R`import cmath
print(cmath.isnan(1))
print(cmath.isinf(1))
print(cmath.pi > 3.14)
print(cmath.e > 2.71)` },
]);

w('_mods20_random.json', [
  { name: 'seed_repro', code: R`import random as r
r.seed(42)
a = r.random()
r.seed(42)
b = r.random()
print(a == b)
print(0.0 <= a and a < 1.0)` },
  { name: 'random_range', code: R`import random
random.seed(7)
for i in range(20):
    x = random.random()
    if not (0.0 <= x < 1.0):
        print('bad')
print('ok')` },
  { name: 'randint_bounds', code: R`import random
random.seed(3)
for i in range(30):
    v = random.randint(1, 6)
    if v < 1 or v > 6:
        print('bad', v)
print('ok')` },
  { name: 'from_import', code: R`from random import randint
v = randint(1, 6)
print(v >= 1 and v <= 6)` },
  { name: 'randrange_bounds', code: R`import random
random.seed(5)
for i in range(20):
    v = random.randrange(10)
    if v < 0 or v > 9:
        print('bad', v)
print('ok')` },
  { name: 'randrange_step', code: R`import random
random.seed(5)
v = random.randrange(2, 10, 2)
print(v >= 2 and v < 10)
print(v % 2)` },
  { name: 'randrange_neg', code: R`import random
random.seed(5)
v = random.randrange(10, 0, -2)
print(v in [2, 4, 6, 8, 10])` },
  { name: 'choice', code: R`import random
random.seed(9)
xs = ['a', 'b', 'c']
for i in range(20):
    x = random.choice(xs)
    if x not in xs:
        print('bad', x)
print('ok')` },
  { name: 'sample', code: R`import random
random.seed(11)
s = random.sample([1, 2, 3, 4, 5], 3)
print(len(s))
print(len(set(s)))
ok = True
for x in s:
    if x < 1 or x > 5:
        ok = False
print(ok)` },
  { name: 'sample_zero', code: R`import random
random.seed(11)
print(random.sample([1, 2, 3], 0))` },
  { name: 'choices', code: R`import random
random.seed(13)
c = random.choices([1, 2, 3])
print(len(c))
print(c[0] in [1, 2, 3])` },
  { name: 'uniform', code: R`import random
random.seed(17)
for i in range(10):
    u = random.uniform(2.0, 3.0)
    if u < 2.0 or u > 3.0:
        print('bad')
print('ok')` },
  { name: 'uniform_rev', code: R`import random
random.seed(17)
for i in range(10):
    u = random.uniform(3.0, 2.0)
    if u < 2.0 or u > 3.0:
        print('bad')
print('ok')` },
  { name: 'shuffle', code: R`import random
random.seed(19)
xs = [1, 2, 3, 4, 5]
random.shuffle(xs)
print(len(xs))
print(sorted(xs))` },
  { name: 'shuffle_empty', code: R`import random
random.seed(19)
xs = []
random.shuffle(xs)
print(len(xs))` },
  { name: 'gauss', code: R`import random
random.seed(23)
g = random.gauss(0.0, 1.0)
print(-6 < g < 6)` },
  { name: 'getrandbits', code: R`import random
random.seed(29)
b = random.getrandbits(8)
print(b >= 0 and b < 256)` },
  { name: 'getrandbits0', code: R`import random
random.seed(29)
print(random.getrandbits(0))` },
  { name: 'err_order', expectError: true, code: R`import random
random.randint(5, 1)` },
  { name: 'err_sample', expectError: true, code: R`import random
random.sample([1, 2], 3)` },
]);

w('_mods20_statistics.json', [
  { name: 'mean', code: R`import statistics
print(statistics.mean([1, 3]))
print(statistics.mean([2.0, 4.0]))` },
  { name: 'mean2', code: R`import statistics
print(statistics.mean([1, 2, 4]))
print(statistics.mean([-1, -2, -3]))` },
  { name: 'fmean', code: R`import statistics
print(statistics.fmean([1, 2, 3]))
print(statistics.fmean([2, 4]))` },
  { name: 'geometric', code: R`import statistics
print(statistics.geometric_mean([1, 4]))
print(statistics.geometric_mean([2, 8]))` },
  { name: 'harmonic', code: R`import statistics
print(statistics.harmonic_mean([1, 2, 4]))
print(statistics.harmonic_mean([2, 2]))` },
  { name: 'median', code: R`import statistics
print(statistics.median([3, 1, 2]))
print(statistics.median([1, 2, 3, 4]))` },
  { name: 'median_lh', code: R`import statistics
print(statistics.median_low([1, 3, 5, 7]))
print(statistics.median_high([1, 3, 5, 7]))` },
  { name: 'mode', code: R`import statistics
print(statistics.mode([1, 2, 2, 3, 3]))
print(statistics.mode([4, 4, 4, 2]))` },
  { name: 'mode_str', code: R`import statistics
print(statistics.mode('abracadabra'))` },
  { name: 'multimode', code: R`import statistics
print(statistics.multimode([1, 2, 2, 3, 3]))` },
  { name: 'pvariance', code: R`import statistics
print(statistics.pvariance([1, 2, 3, 4]))` },
  { name: 'variance', code: R`import statistics
print(statistics.variance([1, 2, 3, 4]))` },
  { name: 'pstdev', code: R`import statistics
print(statistics.pstdev([2, 4, 4, 4, 5, 5, 7, 9]))` },
  { name: 'stdev', code: R`import statistics
print(statistics.stdev([1, 2, 3, 4]))` },
  { name: 'err_empty', expectError: true, code: R`import statistics
print(statistics.mean([]))` },
  { name: 'err_single', expectError: true, code: R`import statistics
print(statistics.variance([5]))` },
  { name: 'alias', code: R`import statistics as st
print(st.mean([1, 3]))` },
  { name: 'from', code: R`from statistics import mean, median
print(mean([1, 3]))
print(median([5, 1, 3]))` },
  { name: 'range_mean', code: R`import statistics
xs = list(range(10))
print(statistics.mean(xs))` },
  { name: 'unsorted_median', code: R`import statistics
print(statistics.median([3, 1, 4, 2]))` },
]);

w('_mods20_time.json', [
  { name: 'ctime_epoch', code: R`import time
s = time.ctime(0)
print(len(s))
print(s[0:3])
print(s[4:7])
print(s[-4:])` },
  { name: 'ctime_day2', code: R`import time
s = time.ctime(86400)
print(s[4:7])
print(s[-4:])` },
  { name: 'asctime', code: R`import time
s = time.asctime()
print(len(s))
print(s[-4:])` },
  { name: 'year', code: R`import time
print(len(time.strftime('%Y')))
print(time.strftime('%Y') > '2020')` },
  { name: 'date_shape', code: R`import time
s = time.strftime('%Y-%m-%d')
print(len(s))
print(s[4] + s[7])` },
  { name: 'time_shape', code: R`import time
s = time.strftime('%H:%M:%S')
print(len(s))
print(s[2] + s[5])` },
  { name: 'yday', code: R`import time
m = int(time.strftime('%m'))
d = int(time.strftime('%d'))
y = int(time.strftime('%Y'))
days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0):
    days[1] = 29
s = 0
for i in range(m - 1):
    s = s + days[i]
print(int(time.strftime('%j')) == s + d)` },
  { name: 'wday_name', code: R`import time
print(len(time.strftime('%a')))` },
  { name: 'month_name', code: R`import time
print(len(time.strftime('%b')))` },
  { name: 'ampm', code: R`import time
print(time.strftime('%p') in ['AM', 'PM'])` },
  { name: 'hour12', code: R`import time
h = int(time.strftime('%I'))
print(h >= 1 and h <= 12)` },
  { name: 'percent', code: R`import time
print(time.strftime('100%%'))` },
  { name: 'consistency', code: R`import time
print(time.strftime('%Y%m%d') == time.strftime('%Y') + time.strftime('%m') + time.strftime('%d'))` },
  { name: 'epoch', code: R`import time
t = time.time()
print(t > 1600000000)
print(t < 4102444800)` },
  { name: 'ns', code: R`import time
n = time.time_ns()
print(n > 1600000000000000000)
print(abs(n / 1000000000 - time.time()) < 86400)` },
  { name: 'perf', code: R`import time
a = time.perf_counter()
b = time.perf_counter()
print(b >= a)
print(time.perf_counter_ns() >= 0)` },
  { name: 'clocks', code: R`import time
print(time.monotonic() >= 0)
print(time.monotonic_ns() >= 0)
print(time.process_time() >= 0)
print(time.process_time_ns() >= 0)` },
  { name: 'hour24', code: R`import time
h = int(time.strftime('%H'))
print(h >= 0 and h < 24)` },
  { name: 'sleep0', code: R`import time
time.sleep(0)
print('slept')` },
  { name: 'err', expectError: true, code: R`import time
print(time.foo())` },
]);

w('_mods20_datetime.json', [
  { name: 'mkdate', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d)` },
  { name: 'attrs', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.year)
print(d.month)
print(d.day)` },
  { name: 'iso_date', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.isoformat())` },
  { name: 'weekday', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.weekday())` },
  { name: 'ordinal', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.toordinal())` },
  { name: 'datetime', code: R`import datetime
d = datetime.datetime(2020, 3, 5, 7, 8, 9)
print(d)
print(d.hour)
print(d.minute)
print(d.second)` },
  { name: 'dt_defaults', code: R`import datetime
d = datetime.datetime(2020, 1, 1)
print(d)
print(d.hour)` },
  { name: 'date_method', code: R`import datetime
d = datetime.datetime(2020, 3, 5, 7, 8, 9)
print(d.date())` },
  { name: 'iso_dt', code: R`import datetime
d = datetime.datetime(2020, 3, 5, 7, 8, 9)
print(d.isoformat())` },
  { name: 'td', code: R`import datetime
t = datetime.timedelta(2, 3661, 500)
print(t.days)
print(t.seconds)
print(t.microseconds)` },
  { name: 'td_carry', code: R`import datetime
t = datetime.timedelta(1, 90061, 1234567)
print(t.days)
print(t.seconds)
print(t.microseconds)` },
  { name: 'fmt_date', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.strftime('%Y/%m/%d'))` },
  { name: 'fmt_dt', code: R`import datetime
d = datetime.datetime(2021, 12, 25, 13, 45, 0)
print(d.strftime('%H:%M'))` },
  { name: 'fmt_names', code: R`import datetime
d = datetime.date(2021, 12, 25)
print(d.strftime('%A %b'))` },
  { name: 'fmt_yday', code: R`import datetime
d = datetime.date(2020, 3, 5)
print(d.strftime('%j'))` },
  { name: 'leap', code: R`import datetime
print(datetime.date(2020, 2, 29))
print(datetime.date(2000, 2, 29))` },
  { name: 'err_day', expectError: true, code: R`import datetime
d = datetime.date(2020, 2, 30)` },
  { name: 'err_month', expectError: true, code: R`import datetime
d = datetime.date(2020, 13, 1)` },
  { name: 'from', code: R`from datetime import date
print(date(2020, 1, 1))` },
  { name: 'compare', code: R`import datetime
a = datetime.date(2020, 1, 1)
b = datetime.date(2020, 1, 2)
print(a == datetime.date(2020, 1, 1))
print(a < b)` },
]);

w('_mods20_re.json', [
  { name: 'digits', code: R`import re
print(re.findall('\\d+', 'a12 b345 c6'))` },
  { name: 'chars', code: R`import re
print(re.findall('a', 'banana'))` },
  { name: 'none', code: R`import re
print(re.findall('zz', 'abc'))` },
  { name: 'search', code: R`import re
print(re.search('b.d', 'abcde') is not None)
print(re.search('zz', 'abc') is None)` },
  { name: 'match', code: R`import re
print(re.match('ab', 'abc') is not None)
print(re.match('bc', 'abc') is None)` },
  { name: 'fullmatch', code: R`import re
print(re.fullmatch('a+', 'aaa') is not None)
print(re.fullmatch('a+', 'aaab') is None)` },
  { name: 'sub_char', code: R`import re
print(re.sub('a', 'X', 'banana'))` },
  { name: 'sub_class', code: R`import re
print(re.sub('[0-9]+', '#', 'a1b22c'))` },
  { name: 'sub_none', code: R`import re
print(re.sub('zz', 'X', 'abc'))` },
  { name: 'split_comma', code: R`import re
print(re.split(',', 'a,b,c'))
print(re.split('[,; |]', 'a,b;c d|e'))
print(re.split('([,;])', 'a,b;c'))` },
  { name: 'split_space', code: R`import re
print(re.split('\\s+', 'a  b   c'))` },
  { name: 'dot', code: R`import re
print(re.findall('.', 'abc'))` },
  { name: 'classes', code: R`import re
print(re.findall('[a-c]', 'xaybzc'))
print(re.findall('[^abc]', 'xaybzc'))
print(re.findall('[a-c]', 'ABC'))
print(re.findall('[A-C]', 'abc'))` },
  { name: 'anchors', code: R`import re
print(re.search('^ab', 'abc') is not None)
print(re.search('^bc', 'abc') is None)
print(re.search('bc$', 'abc') is not None)
print(re.search('bc$', 'abcd') is None)` },
  { name: 'word', code: R`import re
print(re.findall('\\w+', 'a_1 b-2'))` },
  { name: 'space', code: R`import re
print(re.findall('\\s+', 'a b  c'))` },
  { name: 'upper_classes', code: R`import re
print(re.findall('\\D+', 'a12b'))
print(re.findall('\\S+', 'a b  c'))
print(re.findall('\\W+', 'ab-cd'))` },
  { name: 'quantifiers', code: R`import re
print(re.findall('ab*', 'ab abb a'))
print(re.findall('a+', 'baaac'))
print(re.findall('ab?', 'ab a'))` },
  { name: 'alternation', code: R`import re
print(re.findall('cat|dog', 'cat dog bird'))` },
  { name: 'case_flags', code: R`import re
print(re.findall('a', 'AaA'))
print(re.findall('a', 'AaA', re.I))
print(re.search('ab', 'xABy') is None)` },
]);
