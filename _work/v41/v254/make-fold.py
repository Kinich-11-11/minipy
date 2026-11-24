"""Freeze the default full case fold of the release's CPython 3.12 Unicode database."""
import sys
import unicodedata
from pathlib import Path

if sys.implementation.name != 'cpython' or sys.version_info[:2] != (3, 12) or unicodedata.unidata_version != '15.0.0':
    raise SystemExit('Use CPython 3.12 with Unicode 15.0.0')
rows = []
for i in range(sys.maxunicode + 1):
    folded = chr(i).casefold()
    if folded != chr(i):
        rows.append(f'{i:X};' + ' '.join(f'{ord(c):X}' for c in folded))
assert len(rows) == 1530
Path(__file__).with_name('fold-15.0.txt').write_bytes(('\n'.join(rows) + '\n').encode('ascii'))
