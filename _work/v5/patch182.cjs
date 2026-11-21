const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const a = "      is('GDEF', [defBlock('g')]),";
const b = "      is('GDEF', [defBlock('XYZ')]),";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, s.slice(0, i) + b + s.slice(i + a.length));
console.log('flag marker changed');