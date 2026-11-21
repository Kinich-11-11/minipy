// gdiff.cjs <newGap.json> <oldGap.json>
const fs = require('fs');
const [npath, opath] = process.argv.slice(2);
const b = JSON.parse(fs.readFileSync(npath, 'utf8'));
const a = JSON.parse(fs.readFileSync(opath, 'utf8'));
const h = new Map();
for (const r of a) { if (r.same === false) h.set(r.name, 1); else h.set(r.name, 0); }
// Map with `same: true` guard so a pass in the old run can never be counted as "fixed"
const oldFail = new Map(a.map(r => [r.name, r.same === false]));
const fixed = [], still = [], broke = [];
for (const r of b) {
  const was = oldFail.get(r.name);
  const now = r.same === false;
  if (was === true && now === false) fixed.push(r.name);
  else if (was === true && now === true) still.push(r.name);
  else if (was === false && now === true) broke.push(r.name);
}
console.log('fixed=' + fixed.length + ' still=' + still.length + ' broke=' + broke.length);
console.log('FIXED: ' + fixed.join(' | '));
console.log('BROKE: ' + broke.join(' | '));
console.log('STILL: ' + still.join(' | '));
