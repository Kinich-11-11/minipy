"""Generate or check independent CPython transcripts. Only code authored below is run."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import sys

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')
cases = []
def case(name, code):
    with redirect_stdout(StringIO()) as out:
        exec(compile(code, name, 'exec'), {})
    cases.append(dict(name=name, code=code, stdout=out.getvalue().removesuffix('\n')))

slots = [('==','eq','eq'),('!=','ne','ne'),('<','lt','gt'),('>','gt','lt'),('<=','le','ge'),('>=','ge','le')]
for op, f, r in slots:
    case('reflect-'+f, f'''class A:
    def __{f}__(self, other):
        print("left")
        return NotImplemented
class B:
    def __{r}__(self, other):
        print("right")
        return "answer"
def rhs():
    print("rhs")
    return B()
print(A() {op} rhs())''')
    case('builtin-left-'+f, f'class B:\n    def __{r}__(self,x):\n        return 7\nprint(1 {op} B())')
    case('rhs-raises-'+f, f'class A:\n    def __{f}__(self,other):\n        print("unexpected")\n        return 1\ndef rhs():\n    print("rhs")\n    raise KeyError("rhs")\ntry:\n    print(A() {op} rhs())\nexcept KeyError:\n    print("error")')
case('sub-first-inherited','class A:\n    def __lt__(self,x):\n        return "left"\n    def __gt__(self,x):\n        return "right"\nclass B(A):\n    pass\nprint(A()<B(),B()<A())')
case('sub-first-declines','class A:\n    def __lt__(self,x):\n        print("forward")\n        return 2\nclass B(A):\n    def __gt__(self,x):\n        print("reverse")\n        return NotImplemented\nprint(A()<B())')
case('sub-ne-delegation','class A:\n    def __eq__(self,x):\n        return False\nclass B(A):\n    def __eq__(self,x):\n        return True\nprint(A()==B(),A()!=B())')
case('same-type-two-slots','class A:\n    def __init__(self,k):\n        self.k=k\n    def __eq__(self,x):\n        print(self.k)\n        if self.k==1:\n            return NotImplemented\n        return "value"\na=A(1)\nb=A(2)\nprint(a==b)\nprint(a==a)')
case('explicit-ne-declines','class A:\n    def __eq__(self,x):\n        print("wrong")\n        return True\n    def __ne__(self,x):\n        print("ne")\n        return NotImplemented\na=A()\nb=A()\nprint(a!=a,a!=b)')
case('ne-delegate-truth','class Value:\n    def __bool__(self):\n        print("truth")\n        return False\nclass A:\n    def __eq__(self,x):\n        return Value()\nprint(A()!=A())')
case('ne-truth-raises','class Value:\n    def __bool__(self):\n        raise ValueError("no")\nclass A:\n    def __eq__(self,x):\n        return Value()\ntry:\n    print(A()!=A())\nexcept ValueError:\n    print("truth error")')
case('no-implicit-invert','class A:\n    def __eq__(self,x):\n        return True\n    def __ne__(self,x):\n        return NotImplemented\nclass B:\n    def __ne__(self,x):\n        return "ne"\nprint(A()!=B())')
case('cmp-raises','class A:\n    def __lt__(self,x):\n        print("left")\n        raise RuntimeError("stop")\nclass B:\n    def __gt__(self,x):\n        print("unexpected")\n        return 9\ntry:\n    print(A()<B())\nexcept RuntimeError:\n    print("stop")')
case('nested-cmp','class Inner:\n    def __lt__(self,x):\n        return NotImplemented\n    def __gt__(self,x):\n        return 4\nclass A:\n    def __eq__(self,x):\n        print(Inner()<Inner())\n        return NotImplemented\nclass B:\n    def __eq__(self,x):\n        return "done"\nprint(A()==B())')
case('identity-vs-payload','class A:\n    pass\na=A()\nprint(a==a,a!=a,a==1,1==a,a!=1,a==A())')
case('ordered-type-error','class A:\n    pass\nclass B:\n    pass\ntry:\n    print(A() >= B())\nexcept TypeError as e:\n    print(str(e))')
case('non-bool-eq','class A:\n    def __eq__(self,x):\n        return [1,2]\na=A()\nprint(a==a,a!=a)')
case('false-is-a-result','class A:\n    def __lt__(self,x):\n        return False\nclass B:\n    def __gt__(self,x):\n        print("wrong")\n        return True\nprint(A()<B())')

index = 'class I:\n    def __init__(self,k):\n        self.k=k\n    def __index__(self):\n        return self.k\n'
for name, data in [('list','[0,1,2,3,4]'),('tuple','(0,1,2,3,4)'),('unicode','"饜悁a馃檪bc"')]:
    for label, expr in [('start-stop','a[I(-4):I(-1)]'),('stride','a[::I(2)]'),('reverse','a[I(99):I(-99):I(-2)]'),('defaults','(a[:None:I(-1)],a[:-1:I(-1)])'),('bool','a[I(True):True:True]'),('large','a[I(-10**40):I(10**40):I(10**24)]')]:
        case(name+'-'+label, index+f'a={data}\nprint({expr})')
    for label, body, expr in [('bad','return 1.5','a[I():]'),('not-int','return NotImplemented','a[:I()]'),('raises','raise KeyError("no")','a[::I()]'),('zero','return 0','a[::I()]')]:
        exc={'bad':'TypeError','not-int':'TypeError','raises':'KeyError','zero':'ValueError'}[label]
        case(name+'-'+label,f'class I:\n    def __index__(self):\n        {body}\na={data}\ntry:\n    print({expr})\nexcept {exc}:\n    print("{exc}")')
case('slice-eval-and-convert-order','class I:\n    def __init__(self,k):\n        self.k=k\n    def __index__(self):\n        print("index",self.k)\n        return self.k\ndef b(k):\n    print("bound",k)\n    return I(k)\ndef seq():\n    print("receiver")\n    return [0,1,2,3,4]\nprint(seq()[b(0):b(4):b(2)])')
case('zero-before-start','class I:\n    def __index__(self):\n        print("unexpected")\n        return 1\ntry:\n    print([1][I():I():0])\nexcept ValueError:\n    print("zero")')
case('eval-error-before-convert','class I:\n    def __index__(self):\n        print("unexpected")\n        return 1\ndef bad():\n    raise ValueError()\ntry:\n    print([1][I():bad():I()])\nexcept ValueError:\n    print("stop")')
unicode_text = chr(0x10400)+'a'+chr(0x1f642)+'c'
case('unicode-supplementary-slice',f's={unicode_text!r}\nprint(len(s),s[::2],len(s[::2]),s[::-1])')
case('nested-slice',index+f'class J:\n    def __index__(self):\n        return [0,1,2,3][I(1):][I(0)]\ns={unicode_text!r}\nprint(s[J()::J()],[7,8,9][J():])')
case('slice-shallow-copy','x=[9]\na=[x,x]\nb=a[:]\nprint(b is a,b[0] is a[1])\nx.append(8)\nprint(a,b)')
case('callback-mutates-receiver','a=[1,2]\nclass I:\n    def __index__(self):\n        a.append(3)\n        return 0\nprint(a[I():],a)')
case('callback-rebinds-receiver','a=[1,2]\nclass I:\n    def __index__(self):\n        global a\n        a=[5]\n        return 0\nprint(a[I():],a)')
case('slice-invalid-types','for x in [1.5,"1",[1],{}]:\n    try:\n        print([4,5][:x])\n    except TypeError:\n        print("type")')
case('slice-bool','a=[1,2,3]\nprint(a[False:True:True],a[True::True])\ntry:\n    print(a[::False])\nexcept ValueError:\n    print("zero")')
case('literal-delimiters', 'a=[0,1,2]\nprint(a[len("]"):],a[:len(":")],a[::len("[")])')
case('slice-outer-identity','a=[1,2]\nb=a[:]\nc=b\nprint(a is b,b is c,a[:] is a[:],a[::1] is a)\nb.append(3)\nprint(a,b,c)')
case('slice-rebind-alias','a=[1,2,3]\nb=a\nb=a[1:]\nprint(a,b)\nb.append(4)\nprint(a,b)')
case('dict-members-in-slice','d={"k":2}\na=[d]\nb=a[::-1]\nprint(b[0] is a[0])\nd["k"]=3\nprint(b)')
outfile=Path(__file__).with_name('edge-cases.json')
if sys.argv[1:]==['--check']:
    assert json.loads(outfile.read_text(encoding='utf-8'))==cases
elif not sys.argv[1:]:
    outfile.write_text(json.dumps(cases,ensure_ascii=True,indent=2)+'\n',encoding='utf-8',newline='\n')
else:
    raise SystemExit('usage: make-edges.py [--check]')
print(f'{len(cases)} boundary transcripts match CPython {sys.version.split()[0]}')
