const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = "        ...L.outLine(E.join(E.str('PCDBG va=['), E.join(E.var('va'), E.str(']'))))," + NL + "        ...L.outLine(E.join(E.str('PCDBG op=['), E.join(E.var('op'), E.str(']'))))," + NL;
const b = [
  "        ...L.outLine(E.join(E.str('BINDBG op=['), E.join(E.var('op'), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('BINDBG tag=['), E.join(E.letter(E.num(1), E.var('va')), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('BINDBG va=['), E.join(E.var('va'), E.str(']')))),"].join(NL) + NL;
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
// move the probe to the very top of binBlock (after op is set)
v = v.slice(0, i) + v.slice(i + a.length);
const top = "      S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0))," + NL;
const j = v.indexOf(top);
if (j < 0) { console.log('MISS top'); process.exit(1); }
v = v.slice(0, j) + top + b + v.slice(j + top.length);
fs.writeFileSync(V, v);
console.log('top probe added');