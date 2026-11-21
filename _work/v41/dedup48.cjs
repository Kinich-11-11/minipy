const fs = require('fs');
const p = '_work/v41/assemble.cjs';
let s = fs.readFileSync(p, 'utf8');
const before = s;
s = s.replace("'p246.txt','p246.txt',", "'p246.txt',");
if (s === before) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s);
console.log('ok');
