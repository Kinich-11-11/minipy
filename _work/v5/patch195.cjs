const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let s = fs.readFileSync(P, 'utf8');
const a = "      S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('LAM kwpend=['), E.join(E.var('kwpend'), E.str(']'))))]),";
const b = "      ...L.outLine(E.join(E.str('LAM kwpend=['), E.join(E.var('kwpend'), E.str(']')))),";
if (s.indexOf(a) < 0) { console.log('MISS 1'); process.exit(1); }
s = s.replace(a, b);
s = s.replace("        S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('LAM close kwlam=['), E.join(E.var('kwlam'), E.str(']'))))]),", "        ...L.outLine(E.join(E.str('LAM close kwlam=['), E.join(E.var('kwlam'), E.str(']')))),");
s = s.replace("        S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('CALL kws=['), E.join(E.var('kws'), E.str(']'))))]),", "        ...L.outLine(E.join(E.str('CALL kws=['), E.join(E.var('kws'), E.str(']')))),");
fs.writeFileSync(P, s);
console.log('probes unconditional');