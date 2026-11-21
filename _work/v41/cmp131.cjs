// cmp131.cjs <newOutDir> <oldOutDir>
// Compares per-case pass/fail between an old (v4.131) and new result set.
const fs = require('fs');
const path = require('path');
const [newDir, oldDir] = process.argv.slice(2);
const load = (dir) => {
  const m = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.out.json')) continue;
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) m[f.replace('.out.json', '') + '\u0000' + r.name] = r;
  }
  return m;
};
const o = load(oldDir), n = load(newDir);
const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])].sort();
const fixed = [], still = [], broke = [], onlyNew = [];
for (const k of keys) {
  const [tag, name] = k.split('\u0000');
  const ov = o[k] ? (o[k].same ? 'P' : 'F') : '-';
  const nv = n[k] ? (n[k].same ? 'P' : 'F') : '-';
  const row = { tag, name, ov, nv, o: o[k], n: n[k] };
  if (ov === 'F' && nv === 'P') fixed.push(row);
  else if (ov === 'F' && nv === 'F') still.push(row);
  else if (ov === 'P' && nv === 'F') broke.push(row);
  else if (ov === '-' && nv === 'F') onlyNew.push(row);
}
const clean = (r) => ({
  tag: r.tag,
  name: r.name,
  code: (r.n || r.o).code,
  new: r.n ? { out: r.n.mini.out.join(''), err: r.n.mini.err } : null,
  was: r.o ? { out: r.o.mini.out.join(''), err: r.o.mini.err } : null,
  py: (r.n || r.o).py ? (r.n || r.o).py.join('') : null,
  pyerr: (r.n || r.o).pyerr,
});
fs.writeFileSync(newDir + '/_diff.json', JSON.stringify({ fixed: fixed.map(clean), still: still.map(clean), broke: broke.map(clean), onlyNew: onlyNew.map(clean) }, null, 1));
console.log('total=' + keys.length + '  FIXED=' + fixed.length + '  STILL-FAIL=' + still.length + '  BROKE=' + broke.length + '  new-only-fail=' + onlyNew.length);
console.log('\n== FIXED (v4.131 fail -> now pass) ==');
for (const r of fixed) console.log('  [' + r.tag + '] ' + r.name);
console.log('\n== BROKE (v4.131 pass -> now fail) ==');
for (const r of broke) console.log('  [' + r.tag + '] ' + r.name + '  new=' + JSON.stringify(r.n.mini.out.join('')) + (r.n.mini.err ? ' ERR=' + r.n.mini.err : '') + ' py=' + JSON.stringify((r.n.py || []).join('')) + (r.n.pyerr ? ' PYERR=' + r.n.pyerr : ''));
console.log('\n== STILL FAILING ==');
for (const r of still) console.log('  [' + r.tag + '] ' + r.name + '  mini=' + JSON.stringify(r.n.mini.out.join('')) + (r.n.mini.err ? ' ERR=' + r.n.mini.err : '') + ' | py=' + JSON.stringify((r.n.py || []).join('')) + (r.n.pyerr ? ' PYERR=' + r.n.pyerr : ''));
console.log('\n== NEW-ONLY FAIL ==');
for (const r of onlyNew) console.log('  [' + r.tag + '] ' + r.name + '  mini=' + JSON.stringify(r.n.mini.out.join('')) + (r.n.mini.err ? ' ERR=' + r.n.mini.err : '') + ' | py=' + JSON.stringify((r.n.py || []).join('')) + (r.n.pyerr ? ' PYERR=' + r.n.pyerr : ''));
