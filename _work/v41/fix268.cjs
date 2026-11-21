const fs = require('fs');
const p = '_work/v41/p268.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "['pwc1', 'pwc2', 'pwd', 'pwk', 'pwv1', 'pwv2', 'pwt1', 'pwt2'].forEach((n) => newVar(n, 0));";
const to = "['pwc1', 'pwc2', 'pwd', 'pwk', 'pwv1', 'pwv2', 'pwt1', 'pwt2', 'pwm', 'pwi'].forEach((n) => newVar(n, 0));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
