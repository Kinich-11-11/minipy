// triage.cjs <dir> — classify remaining failures into "real" vs "now-throws-as-CPython (test needs try/except)"
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.out.json')) continue;
  for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) if (!r.same) rows.push(r);
}
const names = { };
const real = [], errMatched = [];
for (const r of rows) {
  const m = /^(?:Line \d+: )?([A-Za-z]+Error)\b/.exec(String(r.mini.err || ''));
  const p = /^([A-Za-z]+Error)\b/.exec(String(r.pyerr || ''));
  if (m && p && m[1] === p[1]) errMatched.push(r); else real.push(r);
}
console.log('failures=' + rows.length + '  both-sides-same-exception=' + errMatched.length + '  real=' + real.length);
console.log('\n=== BOTH SIDES RAISE THE SAME EXCEPTION (behaviour already matches CPython; the case just lacks try/except) ===');
for (const r of errMatched) console.log('  [' + r.tag + '] ' + r.name + '   miniErr=' + r.mini.err + '  pyErr=' + r.pyerr);
console.log('\n=== REAL REMAINING ===');
for (const r of real) {
  console.log('  [' + r.tag + '] ' + r.name);
  console.log('      mini=' + JSON.stringify(r.mini.out.join('')) + (r.mini.err ? '  ERR=' + r.mini.err : ''));
  console.log('      cpy =' + JSON.stringify((r.py || []).join('')) + (r.pyerr ? '  PYERR=' + r.pyerr : ''));
}
