const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = "      S.If(E.eq(op(), E.str('%')), [" + NL;
const b = a + "        ...L.outLine(E.join(E.str('PCDBG va=['), E.join(E.var('va'), E.str(']'))))," + NL + "        ...L.outLine(E.join(E.str('PCDBG op=['), E.join(E.var('op'), E.str(']'))))," + NL;
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.slice(0, i) + b + v.slice(i + a.length));
console.log('probe added');