const fs = require('fs');
const p = '_work/v41/p280.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "callProc('charsplit %s', [VAR('ev')])";
const to = "callProc('charsplit', [])";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
