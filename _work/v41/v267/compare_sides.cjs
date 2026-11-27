'use strict';
// Compare the two single-VM dumps produced by one_side.cjs.
// usage: node compare_sides.cjs side_266.json side_267.json
const fs = require('node:fs');
const [aFile, bFile] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(aFile, 'utf8'));
const b = JSON.parse(fs.readFileSync(bFile, 'utf8'));
const bByName = new Map(b.map((r) => [r.name, r]));
let bad = 0;
let changed266 = 0;
for (const ra of a) {
  const rb = bByName.get(ra.name);
  if (!rb) { console.log('MISSING ' + ra.name); bad++; continue; }
  const r0 = ra.runs[0];
  const sameOut = rb.runs.every((r) => JSON.stringify(r.out) === JSON.stringify(r0.out));
  const sameErr = rb.runs.every((r) => r.error === r0.error);
  const sameStatus = rb.runs.every((r) => r.status === r0.status);
  const unchanged = rb.runs.every((r) => !r.changed);
  if (r0.changed) changed266++;
  const pass = sameOut && sameErr && sameStatus && unchanged;
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${ra.name.padEnd(18)} out=${sameOut} err=${sameErr} status=${sameStatus} codeUnchanged=${unchanged}` +
    (r0.changed ? '  [v4.266 changed the code]' : ''));
}
console.log(JSON.stringify({ total: a.length, pass: a.length - bad, fail: bad, v4266ChangedCode: changed266 }));
process.exit(bad ? 1 : 0);
