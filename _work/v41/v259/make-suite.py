"""Generate or check independent CPython transcripts of the five reported programs."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import sys

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')
here = Path(__file__).parent
cases = []
for src in sorted((here / 'src').glob('*.py')):
    code = src.read_text(encoding='utf-8')
    error = ''
    with redirect_stdout(StringIO()) as out:
        try:
            exec(compile(code, src.name, 'exec'), {'__name__': '__main__'})
        except Exception as e:
            error = f'{type(e).__name__}: {e}'
    case = dict(name=src.stem, code=code, stdout=out.getvalue().removesuffix('\n'))
    if error:
        case['error'] = error
    cases.append(case)

outfile = here / 'cases.json'
if sys.argv[1:] == ['--check']:
    assert json.loads(outfile.read_text(encoding='utf-8')) == cases
elif not sys.argv[1:]:
    outfile.write_text(json.dumps(cases, ensure_ascii=True, indent=2) + '\n', encoding='utf-8', newline='\n')
else:
    raise SystemExit('usage: make-suite.py [--check]')
print(f'{len(cases)} transcripts match CPython {sys.version.split()[0]}')
