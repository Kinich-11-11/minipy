// diffout.cjs <base.out.json> <new.out.json> : per-case FIXED / BROKE / same
const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const bm = new Map(b.map((r) => [r.name, r]));
let fixed = 0, broke = 0, same = 0;
for (const r of a) {
  const n = bm.get(r.name);
  if (!n) { console.log('MISSING-IN-NEW ' + r.name); continue; }
  if (!r.same && n.same) { fixed++; console.log('FIXED  ' + r.name); }
  else if (r.same && !n.same) { broke++; console.log('BROKE  ' + r.name); }
  else same++;
}
console.log(process.argv[2] + ' -> ' + process.argv[3] + '  fixed=' + fixed + ' broke=' + broke + ' unchanged=' + same);
