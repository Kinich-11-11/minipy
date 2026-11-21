// still.cjs <newDir> <oldDir>
// Lists every case that still fails in <newDir>, with old-version status and CPython expectation.
const fs = require('fs');
const path = require('path');
const [newDir, oldDir] = process.argv.slice(2);
const load = (dir) => {
  const m = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.out.json')) continue;
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) m.set(f.replace('.out.json', '') + '\u0000' + r.name, r);
  }
  return m;
};
const o = load(oldDir), n = load(newDir);
let still = 0, fixed = 0, broke = 0;
const lines = [];
for (const [k, r] of n) {
  if (r.same) continue;
  const ov = o.get(k);
  const oldFail = ov ? !ov.same : null;
  if (oldFail === false) { broke++; lines.push('BROKE  ' + k); continue; }
  if (oldFail === true) still++; else still++;
  lines.push('FAIL   [' + r.tag + '] ' + r.name + '\n         code: ' + JSON.stringify(r.code) + '\n         mini: ' + JSON.stringify(r.mini.out.join('')) + (r.mini.err ? '  ERR=' + r.mini.err : '') + '\n         cpy : ' + JSON.stringify((r.py || []).join('')) + (r.pyerr ? '  PYERR=' + r.pyerr : ''));
}
// fixed: old fail, new pass
for (const [k, r] of n) {
  if (!r.same) continue;
  const ov = o.get(k);
  if (ov && !ov.same) fixed++;
}
console.log('NEW-SET fail-cases=' + still + '  fixed-since-old=' + fixed + '  regressions=' + broke);
console.log(lines.join('\n'));
