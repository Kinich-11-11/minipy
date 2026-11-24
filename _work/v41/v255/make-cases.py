"""Generate independent CPython stdout for MP-62 boundaries (no MiniPy tables used)."""
from contextlib import redirect_stdout
from io import StringIO
import json
from pathlib import Path
import random

cases = []
def test(name, code):
    with redirect_stdout(StringIO()) as out:
        exec(compile(code, name, 'exec'), {})
    cases.append(dict(name=name, code=code, stdout=out.getvalue().removesuffix('\n')))

def lit(s):
    return json.dumps(s, ensure_ascii=False)

s = 's="a𐐀中🙂z"\n'
test('length-not-graphemes', 'print(len(""),len("😀"),len("中a𐍈"))\nprint(len("é"),len("👩‍💻"),len("🇨🇳"))')
test('signed-index', s+'print(s[0],s[1],s[2],s[-2],s[-1])\nprint(ord(s[-4]),ord(s[-2]))')
test('empty-out-of-range', 's="𐐀a"\nfor k in [2,-3]:\n    try:\n        print(s[k])\n    except IndexError:\n        print("index")\ntry:\n    print(""[0])\nexcept IndexError:\n    print("empty")')
test('slice-ordinary', s+'print(s[:],s[1:4],s[-4:-1])\nprint(s[99:],s[:0],s[-100:100])')
test('slice-strides', s+'print(s[::-1],s[::2],s[::-2])\nprint(s[4:0:-2],s[-2::-2],s[1::3])')
test('slice-explicit-minus-one', s+'print(len(s[:-1:-1]),s[::-1])\nprint(len(s[-100::-1]),s[99:-99:-1])')
test('slice-none-boolean', s+'print(s[True],s[False],s[None:None:-1])\nprint(s[False:True:True])')
test('slice-huge', s+'print(s[-123456789012345678901:123456789012345678901:2])\nprint(s[::123456789012345678901],s[::-123456789012345678901])')
test('slice-interleaved', s+'print(s[1:][::-1][1],s[len("🙂"):-len("𐐀")])\nprint(s[s.index("a"):len(s[-3:])])')
test('bound-order', 'def bound(i):\n    print(i)\n    return i\ns="a𐐀bc🙂"\nprint(s[bound(1):bound(5):bound(2)])')
test('bound-nested-index', s+'print(s[1 if s[-2] == "🙂" else 2:len(s[::2])])')
test('index-type','s="a🙂"\nfor i in [1.5,"0",None]:\n    try:\n        print(s[i])\n    except TypeError:\n        print("type")')
test('slice-errors',s+'try:\n    print(s[::0])\nexcept ValueError:\n    print("zero")\ntry:\n    print(s[1.5:])\nexcept TypeError:\n    print("type")')
test('ord-errors','for v in ["","aa","😀a","é",123,None]:\n    try:\n        print(ord(v))\n    except TypeError:\n        print("type")')
test('casefold-then-slice','s="𐐀Straße".casefold()\nprint(len(s),s[0],ord(s[0]))\nprint(s[:2],s[::-1])')
test('ordinary-for',s+'for c in s:\n    print(ord(c))')
test('list-tuple',s+'print(list(s[:2]))\nprint(tuple(s[-2:]))')
test('iter-next',s+'it=iter(s)\nprint(next(it),next(it),next(it))')
test('comprehension',s+'print([ord(c) for c in s[1:3]])')
test('generator-expression',s+'print(sum(ord(c) for c in s[1:3]))')
test('generator-suspended',s+'g=(ord(c) for c in s)\nprint(next(g))\nprint(s[-2])\nprint(next(g),next(g),next(g),next(g))')
test('yield-from-string','def letters():\n    yield from "𐐀a🙂"\nfor c in letters():\n    print(ord(c))')
test('expanded-call','def f(a,b):\n    print(ord(a),ord(b))\ns="𐐀🙂"\nf(*s)\nprint(*s)')
test('assignment-unpack','a,*m,b="𐐀x🙂𐐨"\nprint(ord(a),m,ord(b))\na,b="🙂𐐀"\nprint(ord(a),ord(b))')
test('delimiters-inside-string','s="𐐀xy"\nk="]"\nv=":"\nd={k:1,v:2}\nprint(s[d["]"]], s[:d[":"]])')
test('ord-ascii-range','print(sum(ord(c) for c in " AZaz09!~"))\nprint(ord("Z"),ord("z"),ord("0"),ord("_"))')
test('list-slice-control','a=[0,1,2,3]\nprint(a[1],a[::-2])\nprint((8,9)[-1])')
test('normal-function','def f(s):\n    return len(s),ord(s[-1]),s[::-1]\nprint(f("p𐐀"))')
test('control-chars','print(ord("\\n"),ord("\\t"),ord(" "))')
# Boundaries of the surrogate ranges and every supplementary plane; deliberate
# lower/case-fold collisions and random BMP inputs test ordinal, not text equality.
points = [0x21,0x30,0x41,0x61,0x7e,0xa0,0xbd,0xc9,0xdf,0x130,0x131,0x17f,0x1c5,
          0x391,0x3a3,0x3c2,0x3c3,0x400,0x13a0,0x13f5,0x13f8,0xab70,0x1e9e,0x212a,0x4e2d,
          0xa7cb,0xd7fe,0xd7ff,0xe000,0xf8ff,0xfffd,0xfffe,0xffff,0x10000,0x103ff,0x10400,0x10428,0x1f600,0x10ffff]
points += [plane*65536+off for plane in range(1,17) for off in (0,0x2345,0xfffe)]
rng = random.Random(829)
points += [rng.randint(0x20,0xd7ff) for _ in range(70)] + [rng.randint(0x10000,0x10ffff) for _ in range(70)]
points=list(dict.fromkeys(points))
for i in range(0,len(points),15):
    batch=points[i:i+15]
    code='\n'.join('print('+','.join('ord('+lit(chr(u))+')' for u in batch[k:k+3])+')' for k in range(0,len(batch),3))
    test(f'ord-sample-{i//15+1:02}',code)
# Inject source literals into the VM Code list: this isolates code-point semantics
# from the language lexer's separate support for Python backslash escapes. CPython's
# parser rejects source containing lone surrogates/NUL, so compute their oracle from
# actual Python strings instead of passing those source bytes to compile().
raw = ['\ud800','\udfff','\ud800a\udfff','\udfff𐐀','\x00','\b','\x07\t']
for i,text in enumerate(raw):
    cases.append(dict(name=f'raw-unit-{i}', code='s="'+text+'"\nprint(len(s),ord(s[0]),ord(s[-1]))',
                      stdout=f'{len(text)} {ord(text[0])} {ord(text[-1])}'))
Path(__file__).with_name('edge-cases.json').write_bytes((json.dumps(cases,indent=2,ensure_ascii=False)+'\n')
                                                       .encode('utf-8', errors='backslashreplace'))
print(len(cases),'programs;',len(points),'sampled ordinals')
