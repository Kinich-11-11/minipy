
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
const anchor = "  const sc = B.makeProcedure('Controller', 'scrollone %s %s', ['zone', 'dir'], true);";
if (!s.includes(anchor)) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
s = s.replace(anchor, anchor + "\n  const SUB = (a, b) => C('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });");
fs.writeFileSync(bp, s);
console.log('SUB helper added');
