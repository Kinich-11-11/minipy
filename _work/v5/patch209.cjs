const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = "      S.If(E.eq(op(), E.str('%')), [" + NL + "        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [" + NL;
const b = "      S.If(E.eq(op(), E.str('%')), [" + NL + "        ...L.outLine(E.str('PCTBRANCH ran'))," + NL + "        ...L.outLine(E.join(E.str('PCTBRANCH tag=['), E.join(E.letter(E.num(1), E.var('va')), E.str(']'))))," + NL + "        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [" + NL;
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.slice(0, i) + b + v.slice(i + a.length));
console.log('branch-entry probe added');