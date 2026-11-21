const fs = require('fs');
const p = '_work/v41/p272.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  for (const id of allIds()) {";
const to = "  for (const id of Object.keys(T(IT).blocks)) {";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
