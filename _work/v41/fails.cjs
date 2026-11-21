// fails.cjs <out.json> ... : list failing cases (name + one-line mini vs cpy), grouped by suite
const fs = require('fs');
const files = process.argv.slice(2);
let total = 0, totalFail = 0;
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('MISSING ' + f); continue; }
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const bad = r.filter((x) => !x.same);
  total += r.length; totalFail += bad.length;
  console.log('== ' + f.replace(/^.*[\\/]/, '') + ' : ' + r.length + ' cases, ' + bad.length + ' fail');
  for (const x of bad) {
    const m = (x.mini.out || []).join('~').slice(0, 60);
    const p = (x.py || []).join('~').slice(0, 60);
    console.log('   - ' + x.name + (x.mini.err ? ' [err]' : ''));
    console.log('     mini: ' + JSON.stringify(m) + (x.mini.err ? ' ERR=' + String(x.mini.err).slice(0, 60) : ''));
    console.log('     cpy : ' + JSON.stringify(p));
  }
}
console.log('TOTAL ' + total + ' cases, ' + totalFail + ' fail');
