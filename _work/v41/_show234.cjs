// _show234.cjs <out.json> [all] : print failing rows (or all rows) line by line
const o = require(require('path').resolve(process.argv[2]));
const all = process.argv[3] === 'all';
let pass = 0;
for (const r of o) {
  if (r.same) pass++;
  if (r.same && !all) continue;
  console.log('== ' + r.name + ' ' + (r.same ? 'PASS' : 'FAIL') + (r.mini.err ? '  err=' + r.mini.err : '') + (r.pyerr ? '  pyerr=' + r.pyerr : ''));
  const n = Math.max(r.mini.out.length, r.py.length);
  for (let i = 0; i < n; i++) {
    const a = r.mini.out[i], b = r.py[i];
    console.log((a === b ? '   ' : ' ! ') + JSON.stringify(a) + (a === b ? '' : '   <-- py: ' + JSON.stringify(b)));
  }
}
console.log('pass ' + pass + '/' + o.length);
