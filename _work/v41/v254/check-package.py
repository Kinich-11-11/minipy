"""Check the finished SB3 independently of the block generator (standard library only)."""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZipFile

if len(sys.argv) != 3:
    raise SystemExit('Usage: python check-package.py baseline.sb3 release.sb3')


def inspect(filename):
    with ZipFile(filename) as z:
        assert z.testzip() is None
        names = z.namelist()
        assert len(names) == len(set(names)), 'duplicate ZIP members'
        project = json.loads(z.read('project.json'))
        assets = {name: hashlib.md5(z.read(name)).hexdigest() for name in names if name != 'project.json'}
        for name, digest in assets.items():
            assert name.split('.')[0] == digest, name
        for t in project['targets']:
            for resource in t['costumes'] + t['sounds']:
                assert assets[resource['md5ext']] == resource['assetId']
        return project, assets


base, candidate = sys.argv[1:]
before, old_assets = inspect(base)
after, new_assets = inspect(candidate)
assert old_assets == new_assets, 'asset contents changed'
assert after['meta']['agent'] == 'MiniPy v4.254'
assert [t['name'] for t in before['targets']] == [t['name'] for t in after['targets']]
rows = [line.split(';') for line in Path(__file__).with_name('fold-15.0.txt').read_text('ascii').splitlines()]
assert len(rows) == len(set(key for key, _ in rows)) == 1530
for a, b in zip(before['targets'], after['targets']):
    if a['name'] != 'Interpreter':
        assert a == b, a['name']
        continue
    initial = len(a['costumes'])
    assert a['costumes'] == b['costumes'][:initial] and b['sounds'] == a['sounds']
    aliases = b['costumes'][initial:]
    assert [c['name'] for c in aliases] == ['@cf828:' + chr(int(k, 16)) for k, _ in rows]
    assert all(c['md5ext'] == a['costumes'][0]['md5ext'] for c in aliases)
    table, = [value for name, value, *_ in b['lists'].values() if name == 'FoldMap828']
    assert table == [''.join(chr(int(x, 16)) for x in dest.split()) for _, dest in rows]
print(json.dumps({'assets': len(new_assets), 'originalAssetsUnchanged': True, 'caseFoldMappings': len(rows),
                  'blocks': sum(len(t['blocks']) for t in after['targets']),
                  'sha256': hashlib.sha256(Path(candidate).read_bytes()).hexdigest()}))
