const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(p, 'utf8');
const a = '  make(t, op, opts) {';
const b = ['  make(t, op, opts) {',
  '    if (op === undefined) { console.log("UNDEF-OP stack:", new Error().stack.split(String.fromCharCode(10)).slice(1, 8).join(String.fromCharCode(10))); throw new Error("undefined op"); }'].join(String.fromCharCode(10));
if (s.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(p, s);
console.log('instrumented');