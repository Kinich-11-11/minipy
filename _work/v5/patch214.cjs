const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const anchors = [
  ['      S.If(E.eq(E.var(\'op\'), E.str(\'and\')), [', 'P1'],
  ['      S.If(E.or(E.eq(E.var(\'op\'), E.str(\'is\')), E.eq(E.var(\'op\'), E.str(\'isnot\'))), [', 'P2'],
  ['      S.If(E.eq(E.var(\'op\'), E.str(\'in\')), [', 'P3'],
  ['      S.If(E.eq(op(), E.str(\'//\')), [', 'P4'],
  ['      S.If(E.eq(op(), E.str(\'%\')), [', 'P5'],
];
for (const [a, tag] of anchors) {
  const i = v.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); continue; }
  v = v.slice(0, i) + "      ...L.outLine(E.str('REACHED " + tag + "'))," + NL + v.slice(i);
  console.log('ok ' + tag);
}
fs.writeFileSync(V, v);