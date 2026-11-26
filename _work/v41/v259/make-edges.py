"""Freeze the v4.259 changes (chained targets, big integers, star arguments, generator
expressions, attribute unary, collections.deque) against CPython 3.12."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import sys

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')
cases = []


def check(name, code):
    with redirect_stdout(StringIO()) as out:
        exec(compile(code, name, 'exec'), {'__name__': '__main__'})
    cases.append(dict(name=name, code=code, stdout=out.getvalue().removesuffix('\n')))


check('chain-subscripts', 'a = [1, 2]\na[0] = a[1] = 5\nprint(a)')
check('chain-name-first', 'a = [1, 2]\nb = a[0] = 5\nprint(a, b)')
check('chain-three-targets', 'a = [1, 2, 3]\na[0] = a[1] = a[2] = 5\nprint(a)')
check('chain-attributes', 'class C:\n    pass\nc = C()\nc.x = c.y = 5\nprint(c.x, c.y)')
check('chain-name-attribute', 'class C:\n    pass\nc = C()\nd = c.x = 5\nprint(d, c.x)')
check('chain-tuple-target', 'a, b = c = [1, 2]\nprint(a, b, c)')
check('chain-grouped-target', '(a, b) = c = [1, 2]\nprint(a, b, c)')
check('chain-dict-target', 'd = {}\ne = d["k"] = 1\nprint(d, e)')
check('chain-rhs-evaluated-once',
      'calls = []\ndef make():\n    calls.append(1)\n    return [7]\na = [0, 0]\na[0] = a[1] = make()\nprint(len(calls), a)')
check('chain-property-setter', '''class Temp:
    def __init__(self):
        self._c = 0
    @property
    def c(self):
        return self._c
    @c.setter
    def c(self, value):
        print("set", value)
        self._c = value
t = Temp()
t.a = t.c = 4
print(t.c)''')

check('big-multiply', 'print(1250496027 * 1103515245)')
check('big-lcg-step', 'state = 42\nstate = (state * 1103515245 + 12345) & 0x7FFFFFFF\nprint(state)')
check('big-and-mask', 'print((2 ** 62 + 12345) & 0x7FFFFFFF)')
check('big-or-xor', 'x = 10 ** 20\nprint(x | 1, x ^ 1, x & 255)')
check('big-negative-ops', 'x = -123456789012345678\nprint(x * 2, x + 1, 0 - x)')
check('big-floor-and-index', 'x = 10 ** 18 + 1\nprint(x // 7, x % 7, [1, 2, 3][x % 3])')
check('big-bitwise-negative', 'print(-5 & 3, -5 | 3, -5 ^ 3, -8 & 0x7FFFFFFF)')
check('big-product-sign', 'print(-123456789012345678 * 987654321098765432)')

check('star-zip-transpose', 'A = [[1, 2], [3, 4]]\nprint(list(zip(*A)))')
check('star-zip-two', 'A = [[1, 2], [3, 4]]\nprint(list(zip(*A, *A)))')
check('star-zip-tuples', 'print(list(zip(*[(1, 2), (3, 4)])))')
check('star-user-function', 'def f(*xs):\n    return xs\nprint(f(*[1, 2]))')

check('genexp-format-literal', 'print(" ".join("{:4d}".format(v) for v in [1, 2]))')
check('genexp-format-call', 'print(list("{:4d}".format(v) for v in [1, 2]))')
check('genexp-repr-literal', 'print(list("{!r}".format(v) for v in ["a", 1]))')

check('unary-method-result', 'class P:\n    def u(self):\n        return 2.0\n    def m(self):\n        return -self.u()\nprint(P().m())')
check('unary-attribute-slot', 'class P:\n    def __init__(self):\n        self.v = [1.5]\n    def m(self):\n        return -self.v[0]\nprint(P().m())')

check('deque-basic', '''from collections import deque
q = deque([1, 2])
q.append(3)
print(q, len(q), bool(q))
print(q.popleft(), q.popleft(), q)''')
check('deque-ends', '''from collections import deque
q = deque()
q.append("a")
q.append("b")
q.appendleft("c")
print(q, q.pop(), q.popleft(), bool(q))''')
check('deque-rotate-extend', '''from collections import deque
q = deque([1, 2, 3])
q.rotate(1)
q.extendleft([0])
print(q, q.count(1), 2 in q)''')
check('deque-maxlen', '''from collections import deque
q = deque([1, 2], maxlen=2)
q.append(3)
print(q, len(q))''')
check('deque-iteration', '''from collections import deque
q = deque((3, 4))
for v in q:
    print(v)
print(q[0])''')
check('deque-empty-error', '''from collections import deque
try:
    deque().popleft()
except IndexError as error:
    print("caught", error)''')

out = Path(__file__).with_name('edge-cases.json')
if sys.argv[1:] == ['--check']:
    assert json.loads(out.read_text(encoding='utf-8')) == cases
elif not sys.argv[1:]:
    out.write_text(json.dumps(cases, ensure_ascii=True, indent=2) + '\n', encoding='utf-8', newline='\n')
else:
    raise SystemExit('usage: make-edges.py [--check]')
print(f'{len(cases)} v4.259 transcripts match CPython {sys.version.split()[0]}')
