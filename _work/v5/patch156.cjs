const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(p, 'utf8');
const a = '    pooledCount += cand.length;';
const b = ['    if (process.env.V5_REGSTAT) console.log("  script " + s + " locals=" + locals.length + " rw=" + globals.filter(Boolean).length + " colors=" + used);',
  '    pooledCount += cand.length;'].join(NL);
if (s.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(p, s);
console.log('instrumented regalloc');