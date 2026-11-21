const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
function rep(a, b, tag) {
  const i = v.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  v = v.slice(0, i) + b + v.slice(i + a.length);
  console.log('ok ' + tag);
}
// 1. a helper: numbers and booleans are both arithmetic operands (True is 1, False is 0)
rep("  const seqTag = (x) =>", "  const isNumLike = (x) => E.or(L.isNum(x), E.eq(E.letter(E.num(1), x), E.str('B')));" + NL + "  const seqTag = (x) =>", 'isNumLike');
// 2. arithmetic guard in binBlock
rep("      S.If(E.and(L.isNum(E.var('va')), E.and(L.isNum(E.var('vb')), E.and(E.eq(E.var('rt'), E.str('N')),",
    "      S.If(E.and(isNumLike(E.var('va')), E.and(isNumLike(E.var('vb')), E.and(E.eq(E.var('rt'), E.str('N')),", 'arith guard');
// 3. comparison: True == 1, False < 1
rep("      S.If(E.and(L.isNum(va), L.isNum(vb)), [" + NL + "        ...L.payInto(va, 'ona'), ...L.payInto(vb, 'onb'),",
    "      S.If(E.and(isNumLike(va), isNumLike(vb)), [" + NL + "        ...L.payInto(va, 'ona'), ...L.payInto(vb, 'onb'),", 'scalarOrder');
// 4. string repeat: 'ab' * True
rep("      S.If(E.and(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), L.isNum(E.var('vb'))), [" + NL + "        S.set('res', E.str('S'))," + NL + "        S.Repeat(E.var('nb'), [S.set('res', E.join(E.var('res'), E.var('na')))])," + NL + "        S.set('rt', E.str('R'))," + NL + "      ])," + NL + "      S.If(E.and(L.isNum(E.var('va')), E.eq(E.letter(E.num(1), E.var('vb')), E.str('S'))), [",
    "      S.If(E.and(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), isNumLike(E.var('vb'))), [" + NL + "        S.set('res', E.str('S'))," + NL + "        S.Repeat(E.var('nb'), [S.set('res', E.join(E.var('res'), E.var('na')))])," + NL + "        S.set('rt', E.str('R'))," + NL + "      ])," + NL + "      S.If(E.and(isNumLike(E.var('va')), E.eq(E.letter(E.num(1), E.var('vb')), E.str('S'))), [", 'repeat guard');
fs.writeFileSync(V, v);