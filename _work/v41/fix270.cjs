const fs = require('fs');
const p = '_work/v41/p270.txt';
let s = fs.readFileSync(p, 'utf8');
const from = 'const msg = (kind) => JOIN(txt("cannot use \'")';
const to = 'const msg = (kind) => JOIN(txt("TypeError: cannot use \'")';
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
