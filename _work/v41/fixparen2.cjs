const fs = require('fs');
const p = '_work/v41/_paren2.txt';
let s = fs.readFileSync(p, 'utf8');
const from = '### paren tuple then var\nz = (1, 2), q\nprint(z)';
const to = '### paren tuple then var\nq = 7\nz = (1, 2), q\nprint(z)';
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
