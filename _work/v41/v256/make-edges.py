"""Freeze independent CPython 3.12 results for release boundary tests."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import sys

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')

cases=[]
def check(name, code):
    with redirect_stdout(StringIO()) as out:
        exec(compile(code,name,'exec'),{})
    cases.append(dict(name=name,code=code,stdout=out.getvalue().removesuffix('\n')))

for power in (53,64,100,256):
    check(f'mixed-{power}',f'a=2**{power}\nb=float(a)\nprint(a==b,a+1>b,b<a+1)\nprint(-a== -b,-a-1 < -b)\nprint(a-1<b,b>a-1)')
check('mixed-nonfinite','a=2**70\nprint(a<float("inf"),-a>float("-inf"))\nprint(a==float("nan"),a!=float("nan"))')
check('mixed-signed','a=2**56\nprint(-a<0.5,a>-0.25,-a>=0.5,a<=-0.25)')
check('complex-real','z=complex(2,0)\nfor f in [int,float]:\n    try:\n        f(z)\n    except TypeError:\n        print("type")\nprint(z.conjugate()==z)')
check('negative-power','for n in [-1,-2,-0.5]:\n    try:\n        print(0**n)\n    except ZeroDivisionError:\n        print("zero")\ntry:\n    print(pow(0,-3))\nexcept ZeroDivisionError:\n    print("pow")\nprint(0**0,2**-2)')
check('op-once','class A:\n    def __add__(self,x):\n        print("add")\n        return NotImplemented\nclass B:\n    def __radd__(self,x):\n        print("radd")\n        return 8\ndef f():\n    print("rhs")\n    return B()\nprint(A()+f())')
check('op-no-same-reflection','class A:\n    def __add__(self,x):\n        return NotImplemented\n    def __radd__(self,x):\n        return 2\ntry:\n    print(A()+A())\nexcept TypeError:\n    print("type")')
check('sub-inherits-radd','class A:\n    def __add__(self,x):\n        return 3\n    def __radd__(self,x):\n        return 4\nclass B(A):\n    pass\nprint(A()+B())')
check('sub-declines','class A:\n    def __add__(self,x):\n        print("forward")\n        return 3\nclass B(A):\n    def __radd__(self,x):\n        print("reverse")\n        return NotImplemented\nprint(A()+B())')
check('iadd-rebind','class A:\n    def __iadd__(self,x):\n        return x+1\na=A()\nb=a\na+=8\nprint(a,a is b)')
check('iadd-declines','class A:\n    def __iadd__(self,x):\n        print("iadd")\n        return NotImplemented\n    def __add__(self,x):\n        print("add")\n        return 4\ndef rhs():\n    print("rhs")\n    return 9\na=A()\na+=rhs()\nprint(a)')
check('singleton','print(NotImplemented,repr(NotImplemented))\nprint(NotImplemented is not None,NotImplemented is NotImplemented)')
check('bound-owner','class A:\n    def f(self):\n        return 7\na=A()\nb=A()\ng=b.f\nprint(g.__self__ is a,g.__self__ is b,g())')
check('attr-errors','class A:\n    @property\n    def x(self):\n        raise AttributeError("absent")\n    @property\n    def y(self):\n        return 0\na=A()\nprint(hasattr(a,"x"),hasattr(a,"y"),hasattr(a,"z"))')
check('delattr-raises','class A:\n    def __delattr__(self,n):\n        raise ValueError(n)\na=A()\ntry:\n    del a.x\nexcept ValueError:\n    print("value")')
check('index-signed','class I:\n    def __index__(self):\n        return -1\na=[1,2]\nprint(a[I()],"x🙂"[I()])\na[I()]=9\nprint(a)\ndel a[I()]\nprint(a)')
check('index-bad','class I:\n    def __index__(self):\n        return 1.5\ntry:\n    print([3,4][I()])\nexcept TypeError:\n    print("type")')
check('range-args','class I:\n    def __index__(self):\n        return 2\nprint(list(range(I(),8,I())))')
check('slice-gen','def g():\n    yield 7\n    yield 9\na=[1,2,3,4]\na[::2]=g()\nprint(a)')
check('slice-exception','def g():\n    yield 7\n    raise ValueError("stop")\na=[1,2,3]\ntry:\n    a[1:]=g()\nexcept ValueError:\n    print(a)')
check('nested-empty','a,(*b,c),*d=[1,[2]]\nprint(a,b,c,d)')
check('closure-rebind','def outer():\n    x=1\n    def drop():\n        nonlocal x\n        del x\n    def put(v):\n        nonlocal x\n        x=v\n    def read():\n        return x\n    return drop,put,read\ng,p,h=outer()\ng()\np(9)\nprint(h())')
check('comp-map-order','def f(x):\n    print("pull",x)\n    return x\ndef g(x):\n    print("body",x)\n    return x+1\nprint([g(x) for x in map(f,[1,2])])')
check('comp-enumerate-pairs','print([i+c for i,c in enumerate([4,5,6],2) if c>4])')
check('view-set-dynamic','d={1:0,2:0}\nk=d.keys()\nd[3]=0\nprint(sorted(k & {2,3,4}),k > {1,3},k == {1,2,3})')
check('map-shortest','def f(x,y):\n    return x+y\na=map(f,[1,2,3],[4])\nprint(next(a),next(a,99),list(a))')
check('filter-none','a=filter(None,[0,1,2,0,3])\nprint(next(a),list(a),list(a))')
check('with-unwind','class C:\n    def __init__(self,n):\n        self.n=n\n    def __enter__(self):\n        print("enter",self.n)\n        return self.n\n    def __exit__(self,t,v,b):\n        print("exit",self.n,t is None)\n        return self.n==2\nwith C(1) as a,C(2) as b:\n    print(a,b)\n    raise ValueError("x")')
check('stats-qualified-alias','import statistics as st\ntry:\n    st.variance([])\nexcept (TypeError,st.StatisticsError):\n    print(st.StatisticsError.__name__)')
check('stats-import-alias','from statistics import StatisticsError as SE,variance\ntry:\n    variance([1])\nexcept SE:\n    print(SE.__name__)')
check('stats-base','import statistics as st\ntry:\n    st.variance([])\nexcept ValueError as e:\n    print(type(e).__name__)')
check('math-prod-lazy','from math import prod\nprint(prod(map(lambda x:x+1,[1,2,3])),prod([],start="a"),prod([3],start="a"))')
check('math-prod-int','from math import prod\nprint(prod([2**80,4])==2**82)')
check('math-close-nonfinite','import math\na=float("inf")\nn=float("nan")\nprint(math.isclose(a,a),math.isclose(a,-a),math.isclose(n,n))\nprint(math.isclose(1,20,rel_tol=0,abs_tol=30))')
check('math-close-invalid','from math import isclose\ntry:\n    isclose(1,1,rel_tol=-1)\nexcept ValueError:\n    print("value")\ntry:\n    isclose(1,2,0.5)\nexcept TypeError:\n    print("type")')
check('hash-collisions','class A:\n    def __init__(self,x,h):\n        self.x=x\n        self.h=h\n    def __eq__(self,b):\n        return self.x==b.x\n    def __hash__(self):\n        return self.h\na=A(1,7)\nb=A(2,7)\nc=A(1,8)\nd={a:10,b:20,c:30}\nprint(len(d),d[A(2,7)],len({a,b,c}))')
check('hash-replace','class A:\n    def __hash__(self):\n        return 5\n    def __eq__(self,b):\n        return True\na=A()\nd={a:1}\nd[A()]=3\nprint(len(d),d[a],list(d)[0] is a)')
check('hash-errors','class A:\n    def __hash__(self):\n        return 1.5\nclass B:\n    __hash__=None\nfor x in [A(),B(),([],)]:\n    try:\n        hash(x)\n    except TypeError:\n        print("type")')
check('hash-builtin','print(hash(-1),hash(2**82),hash(-2**70),hash(2.5),hash(1)==hash(True))\nprint(hash((1,2))==hash((1.0,2)),hash("x")==hash("x"))')
check('hash-eq-refused','class A:\n    def __hash__(self):\n        return 4\n    def __eq__(self,b):\n        return NotImplemented\nclass B(A):\n    def __hash__(self):\n        return 4\n    def __eq__(self,b):\n        return True\nprint({A():1}[B()])')
check('frozen-construct','s=frozenset(map(int,["2","2","3"]))\nprint(type(s).__name__,sorted(s),bool(s),bool(frozenset()),2 in s)\nprint(frozenset(s) == {2,3})')
check('frozen-operators','a=frozenset([1,2]); b=frozenset([2,3])\nprint(type(a|b).__name__,sorted(a|b),sorted(a & b),sorted(a-b),sorted(a^b))\nprint(a<=a|b,a=={2,1})'.replace('; ','\n'))
check('frozen-nest','a=frozenset([1,2])\nb=frozenset([2,1])\nprint(hash(a)==hash(b),len({a,b}),{(a,):5}[(b,)])')
check('frozen-loop','a=frozenset([1,2])\nt=0\nfor x in a:\n    t+=x\nprint(t,sorted([x+1 for x in a]),repr(frozenset()))')
check('notimplemented-storage','a=[NotImplemented]\nprint(a[0] is NotImplemented,(NotImplemented,)[0] is NotImplemented)')
check('has-fallback','class A:\n    def __getattr__(self,n):\n        if n=="x":\n            return 3\n        if n=="broken":\n            raise ValueError("bad")\n        raise AttributeError(n)\na=A()\nprint(hasattr(a,"x"),hasattr(a,"y"))\ntry:\n    hasattr(a,"broken")\nexcept ValueError:\n    print("value")\ntry:\n    hasattr(a,1)\nexcept TypeError:\n    print("type")')
check('ct-counts','from collections import Counter\na=Counter("aba")\nprint(a["a"],a["c"],len(a))\nb=Counter({"a":-2,"c":4})\nprint(sorted((a+b).items()))')
check('ct-alias','from collections import Counter\na=Counter([1,1])\nb=a\nv=a.items()\nb[2]=4\nprint(sorted(v),a[2],b[1])')
check('ct-keywords','from collections import Counter\na=Counter("aba",a=3,c=-1)\nprint(a["a"],a["b"],a["c"],a["d"])')
check('heap-order','import heapq\na=[5,4,3,2,1]\nb=a\nheapq.heapify(a)\nprint(b[0])\nheapq.heappush(b,0)\nprint(a[0],len(a))\nprint([heapq.heappop(b) for i in range(6)],len(a))')
check('heap-strings','from heapq import heappush,heappop\na=[]\nheappush(a,"b")\nheappush(a,"a")\nprint(heappop(a),heappop(a))\ntry:\n    heappop(a)\nexcept IndexError:\n    print("empty")')
check('heap-comparators','import heapq\nclass K:\n    def __init__(self,x):\n        self.x=x\n    def __lt__(self,b):\n        return self.x<b.x\na=[K(4),K(1),K(2)]\nheapq.heapify(a)\nk=heapq.heappop(a)\nprint(k.x,len(a))')
check('reduce-single-empty','from functools import reduce\nprint(reduce(None,[3]),reduce(None,[],7))\ntry:\n    reduce(None,[])\nexcept TypeError:\n    print("empty")')
check('reduce-nested','from functools import reduce\ndef f(a,b):\n    return a+reduce(lambda x,y:x+y,b,0)\nprint(reduce(f,[[1,2],[3,4]],1))')
check('accumulate-callback','from itertools import accumulate\ndef f(x,y):\n    print("combine",x,y)\n    return x*y\na=accumulate([2,3],f,initial=5)\nprint(next(a))\nprint(next(a))\nprint(list(a))')
check('chain-lazy','from itertools import chain\ndef rows():\n    print("outer1")\n    yield [1,2]\n    print("outer2")\n    yield [3]\na=chain.from_iterable(rows())\nprint(next(a))\nprint(list(a))\nprint(list(chain([],"ab",[3])))')
Path(__file__).with_name('edge-cases.json').write_bytes((json.dumps(cases,ensure_ascii=False,indent=2)+'\n').encode())
