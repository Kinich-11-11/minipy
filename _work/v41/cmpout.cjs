// compare two run.mjs output files case by case (python side AND interpreter side)
// node _work/v41/cmpout.cjs <a.json> <b.json>
const fs = require('fs');
const [a, b] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a, 'utf8'));
const B = JSON.parse(fs.readFileSync(b, 'utf8'));
const cat = (x) => (x || []).join('\n');
const mpOf = (c) => (c.mini ? c.mini.out : (c.mp ? c.mp.out : undefined));
const key = (c) => c.name + '|' + (c.tag || '');
const mb = new Map(B.map((c) => [key(c), c]));
let diff = 0;
for (const ca of A) {
  const cb = mb.get(key(ca));
  if (!cb) { console.log('MISSING in B: ' + key(ca)); diff++; continue; }
  const pyDiff = cat(ca.py) !== cat(cb.py) && cat(ca.py && ca.py.out) !== cat(cb.py && cb.py.out);
  const mpA = mpOf(ca), mpB = mpOf(cb);
  if (mpA === undefined || mpB === undefined) { console.log('no-mp ' + key(ca) + ' ' + typeof mpA + '/' + typeof mpB); }
  if (pyDiff || cat(mpA) !== cat(mpB)) {
    diff++;
    console.log('DIFF ' + key(ca));
    console.log('   A py: ' + JSON.stringify(ca.py && ca.py.out) + '  mp: ' + JSON.stringify(mpA));
    console.log('   B py: ' + JSON.stringify(cb.py && cb.py.out) + '  mp: ' + JSON.stringify(mpB));
  }
}
console.log('compared=' + A.length + ' diff=' + diff);
