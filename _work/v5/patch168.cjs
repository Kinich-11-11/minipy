const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(p, 'utf8');
const a = "      if (regs.size === 1) {";
const b = "      if (regs.size === 1 && !process.env.V5_NOSPLIT) {";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.slice(0, i) + b + s.slice(i + a.length));
console.log('nosplit knob added');