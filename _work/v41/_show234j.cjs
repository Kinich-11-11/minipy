// _show234j.cjs <out.json> [all] : joined comparison (mini chunks concatenated, py lines joined)
const o = require(require('path').resolve(process.argv[2]));
const all = process.argv[3] === 'all';
let pass = 0;
for (const r of o) {
  if (r.same) pass++;
  if (r.same && !all) continue;
  console.log('== ' + r.name + ' ' + (r.same ? 'PASS' : 'FAIL') + (r.mini.err ? '  err=' + r.mini.err : '') + (r.pyerr ? '  pyerr=' + r.pyerr : ''));
  if (r.same) continue;
  const a = (r.mini.out || []).join('');
  const b = (r.py || []).join('\n');
  const al = a.split('\n'), bl = b.split('\n');
  const n = Math.max(al.length, bl.length);
  for (let i = 0; i < n; i++) {
    if (al[i] === bl[i]) console.log('   ' + JSON.stringify(al[i]));
    else console.log(' ! ' + JSON.stringify(al[i]) + '   <-- py: ' + JSON.stringify(bl[i]));
  }
}
console.log('pass ' + pass + '/' + o.length);
