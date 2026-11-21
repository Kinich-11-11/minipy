const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
if (v.indexOf('module.exports = { build, setup, key, BUILTINS };') >= 0) {
  v = v.replace('module.exports = { build, setup, key, BUILTINS };', 'module.exports = { build, setup, key, BUILTINS, EXCNAMES };');
  fs.writeFileSync(V, v);
  console.log('ok export EXCNAMES');
} else console.log('MISS export');
let s = fs.readFileSync(C, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("const NdG = (nd) => E.item('NdG', nd);",
    "const NdG = (nd) => E.item('NdG', nd);" + NL + "const { EXCNAMES } = require('./vm.js');" + NL + "const STOPEX = E.str('C' + (EXCNAMES.indexOf('StopIteration') + 1));" + NL + "const NXV = '__nxv';", 'imports');
rep("  function compStmt() {", "  // ---------------- next(gen) ----------------\n  // Builtins cannot run user code, so `next(g)` is compiled inline: resume the generator\n  // with ITER/NEXT/NCHK, park the yielded value in a scratch variable while the two\n  // iterator slots are popped, then jump over the StopIteration path.\n  function compNext() {\n    const nd = () => E.var('cnd');\n    return [\n      S.chg('labTop', E.num(2)),\n      S.set('lst', E.sub(E.var('labTop'), E.num(1))),\n      S.set('lnd', E.var('labTop')),\n      ...addK(STOPEX, 'kci'),\n      ...pushT('l', E.var('lnd')),\n      ...pushT('e', E.str('RAISE')),\n      ...pushT('e', E.str('PUSHK'), E.var('kci')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('l', E.var('lst')),\n      ...pushT('j', E.str('JMP'), E.var('lnd')),\n      ...pushT('e', E.str('PUSHV'), E.str('__nxv')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('STOREV'), E.str('__nxv')),\n      ...pushT('j', E.str('NCHK'), E.var('lst')),\n      ...pushT('j', E.str('NEXT'), E.var('lst')),\n      ...pushT('e', E.str('ITER')),\n      ...pushT('n', Ch(nd(), E.num(1))),\n    ];\n  }\n  function compStmt() {", 'compNext');
rep("        ], [" + NL + "        S.If(E.and(E.ge(NdN(nd()), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr'))), [",
    "        ], [" + NL + "        S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name'))," + NL + "          E.eq(NdA(Ch(nd(), E.num(0))), E.str('next|0000'))), E.eq(NdN(nd()), E.num(2))), [...compNext()])," + NL + "        S.If(E.and(E.ge(NdN(nd()), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr'))), [", 'hook');
fs.writeFileSync(C, s);