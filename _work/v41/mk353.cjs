const fs = require('fs');
let s = fs.readFileSync('_work/v41/p352.txt', 'utf8');
const from = "            ADD(VAR('p344close'), num(1)),\n            argOf('hi')";
const to = "            ADD(VAR('p344close'), num(2)),\n            argOf('hi')";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p353.txt', s.replace(from, to).split('P352').join('P353'));
console.log('wrote p353.txt (close+2 .. hi)');