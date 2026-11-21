const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const a = "        ...L.outLine(E.join(E.str('SPDBG pl=['), E.join(E.var('pl'), E.join(E.str('] n='), E.item('LCount', E.var('pl')))))),";
if (s.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
const b = [
  "        ...L.outLine(E.join(E.str('SPDBG a1=['), E.join(E.item('Stk', E.add(E.var('ubase'), E.num(1))), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('SPDBG a2=['), E.join(E.item('Stk', E.add(E.var('ubase'), E.num(2))), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('SPDBG a3=['), E.join(E.item('Stk', E.add(E.var('ubase'), E.num(3))), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('SPDBG na='), E.var('nargs'))),"].join(NL);
fs.writeFileSync(V, s.slice(0, s.indexOf(a)) + b + s.slice(s.indexOf(a) + a.length));
console.log('probe v2 installed');