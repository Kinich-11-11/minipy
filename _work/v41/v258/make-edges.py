"""Freeze MiniPy top-level __name__ behavior against CPython 3.12."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import sys

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')
cases=[]
def check(name,code):
    with redirect_stdout(StringIO()) as out:
        exec(compile(code,name,'exec'),{'__name__':'__main__'})
    cases.append(dict(name=name,code=code,stdout=out.getvalue().removesuffix('\n')))

check('main-guard','if __name__ == "__main__":\n    print("main")')
check('main-value','print(__name__)')
check('function-global','def read_name():\n    return __name__\nprint(read_name())')
check('class-global','class C:\n    value = __name__\nprint(C.value)')
check('override-disables-guard','__name__ = "helper"\nif __name__ == "__main__":\n    print("wrong")\nelse:\n    print(__name__)')
check('main-inequality','if __name__ != "__main__":\n    print("wrong")\nelse:\n    print("main")')
check('main-as-argument','def f(name):\n    print(name)\nf(__name__)')
check('main-string-method','print(__name__.upper())')
check('main-format','print("{}:{}".format(__name__, 1))')

out=Path(__file__).with_name('edge-cases.json')
if sys.argv[1:]==['--check']:
    assert json.loads(out.read_text(encoding='utf-8'))==cases
elif not sys.argv[1:]:
    out.write_text(json.dumps(cases,ensure_ascii=True,indent=2)+'\n',encoding='utf-8',newline='\n')
else:
    raise SystemExit('usage: make-edges.py [--check]')
print(f'{len(cases)} __name__ transcripts match CPython {sys.version.split()[0]}')