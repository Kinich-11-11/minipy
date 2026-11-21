const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let s = fs.readFileSync(C, 'utf8');
const h0 = s.indexOf('  const lcTmp = (nd) =>');
const h1 = s.indexOf('  function compDict() {');
if (h0 < 0 || h1 < 0 || h1 < h0) { console.log('MISS ' + h0 + ' ' + h1); process.exit(1); }
// also drop the leading comment block of the helper
let c0 = h0;
while (c0 > 0) {
  const prev = s.lastIndexOf(NL, c0 - 1);
  const line = s.slice(prev + 1, c0);
  if (line.indexOf('//') === 2 || line.trim() === '') c0 = prev + 1; else break;
}
s = s.slice(0, c0) + s.slice(h1);
fs.writeFileSync(C, s);
console.log('dead helpers removed');