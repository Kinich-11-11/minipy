const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let s = fs.readFileSync(C, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("          S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')), [...compDict()], [",
    "          S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')), [...lcWrap(compDict(), [2])], [", 'dc');
rep("            S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')), [...compNest()], [",
    "            S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')), [...lcWrap(compNest(), [2, 4])], [", 'lc2');
rep("              S.If(E.eq(NdN(nd()), E.num(5)), [...compIfStmt()], [...compStmt()]),",
    "              S.If(E.eq(NdN(nd()), E.num(5)), [...lcWrap(compIfStmt(), [2])], [...lcWrap(compStmt(), [2])]),", 'lc');
fs.writeFileSync(C, s);