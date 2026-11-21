const fs = require('fs');
const p = '_work/v41/assemble.cjs';
let s = fs.readFileSync(p, 'utf8');
const m = s.match(/const parts=\[([^\]]*)\]/);
const arr = m[1].split(',').map((x) => x.trim());
const seen = new Set();
const out = [];
for (const t of arr) {
  if (seen.has(t)) { console.log('dropping duplicate ' + t); continue; }
  seen.add(t);
  out.push(t);
}
s = s.replace(m[0], 'const parts=[' + out.join(',') + ']');
fs.writeFileSync(p, s);
console.log('parts=' + out.length);
