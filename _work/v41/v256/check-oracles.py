"""Verify the frozen transcripts independently (this does NOT execute MiniPy)."""
import contextlib
import io
import json
import sys
import warnings
from pathlib import Path

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12):
    raise SystemExit('Use CPython 3.12')
root = Path(__file__).resolve().parent
for name in ['report-r.json', 'edge-cases.json']:
    cases = json.loads((root / name).read_text(encoding='utf-8'))
    assert len({case['name'] for case in cases}) == len(cases)
    for case in cases:
        with contextlib.redirect_stdout(io.StringIO()) as output, warnings.catch_warnings():
            warnings.simplefilter('ignore', DeprecationWarning)
            exec(compile(case['code'], case['name'], 'exec'), {'__name__': '__main__'})
        actual = output.getvalue().removesuffix('\n')
        if actual != case['stdout']:
            raise AssertionError((case['name'], actual, case['stdout']))
    print(f'{name}: {len(cases)} transcripts match CPython {sys.version.split()[0]}')
