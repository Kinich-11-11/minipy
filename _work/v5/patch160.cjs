const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
const a = "      is('IMPORTFROM', []),";
const b = "      is('IMPORTFROM', [])," + NL + "      ...dispatchTree(op, items),";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
s = s.slice(0, i) + b + s.slice(i + a.length);
fs.writeFileSync(p, s);
console.log('tree hooked up');