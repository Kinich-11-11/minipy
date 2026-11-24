"""Create real MiniPy RUN programs covering every mapped scalar, with independent CPython stdout."""
import json
import sys
import unicodedata
from pathlib import Path

if sys.implementation.name != 'cpython' or unicodedata.unidata_version != '15.0.0':
    raise SystemExit('Use the CPython Unicode 15.0.0 oracle')
changed = [chr(i) for i in range(sys.maxunicode + 1) if chr(i).casefold() != chr(i)]
assert len(changed) == 1530
# Also test already-folded forms (Cherokee folds to upper case), combining marks,
# mixed mapped/unmapped surrogate pairs, literal digits, punctuation and empty input.
probes = ''.join(changed) + ''.join(dict.fromkeys(''.join(changed).casefold())) + '你好🙂𐐀🙂ıiİI0123+?!'
chunks, buf = [], ''
for c in probes:
    if len((buf + c).casefold().encode('utf-16-le')) // 2 > 23:
        chunks.append(buf)
        buf = ''
    buf += c
chunks += [buf, '']
cases = []
for i in range(0, len(chunks), 10):
    batch = chunks[i:i + 10]
    cases.append(dict(name=f'fold-{i//10+1:02}', code='\n'.join('print(' + json.dumps(s, ensure_ascii=False) + '.casefold())' for s in batch),
                      stdout='\n'.join(s.casefold() for s in batch)))
Path(sys.argv[1]).write_bytes((json.dumps(cases, ensure_ascii=False, indent=2) + '\n').encode())
print(f'{len(changed)} changed scalars, {len(cases)} RUN programs')
