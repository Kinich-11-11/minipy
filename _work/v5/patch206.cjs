const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = "      S.set(dst, E.join(E.str('S'), E.var('sfo')))," + NL + "    ];" + NL + "  }" + NL;
const b = "      ...L.outLine(E.join(E.str('SFDBG sf=['), E.join(E.var('sf'), E.str('] sfo=['))))," + NL +
  "      ...L.outLine(E.join(E.var('sfo'), E.str(']')))," + NL + a;
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.slice(0, i) + b + v.slice(i + a.length));
console.log('probe added');