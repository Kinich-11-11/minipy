// node cmpout2.cjs <ref.json> <new.json> : compare run.mjs snapshots ignoring the timing field
const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'ms' || k === 'steps' ? undefined : v)));
const sa = strip(a), sb = strip(b);
const name = (x) => x.name;
const map = (x) => new Map(x.map((r) => [r.name, JSON.stringify(strip(r))]));
const ma = map(sa), mb = map(sb);
let diff = 0, added = 0, removed = 0, same = 0;
for (const [k, v] of ma) {
  if (!mb.has(k)) { removed++; console.log('REMOVED ' + k); continue; }
  if (mb.get(k) === v) { same++; continue; }
  diff++;
  console.log('DIFF ' + k);
  const ra = JSON.parse(v), rb = JSON.parse(mb.get(k));
  for (const f of ['same', 'mini', 'py']) {
    const ja = JSON.stringify(ra[f]), jb = JSON.stringify(rb[f]);
    if (ja !== jb) console.log('   ' + f + ':\n     ref ' + ja + '\n     new ' + jb);
  }
}
for (const k of mb.keys()) if (!ma.has(k)) { added++; console.log('ADDED ' + k); }
console.log(`TOTAL same=${same} diff=${diff} added=${added} removed=${removed}`);
