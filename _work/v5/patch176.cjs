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
// node flag accessor
rep("const NdN = (nd) => E.item('NdN', nd);", "const NdN = (nd) => E.item('NdN', nd);" + NL + "const NdG = (nd) => E.item('NdG', nd);", 'NdG accessor');
// yield node -> YIELD instruction
rep("      S.If(E.eq(ck(), E.str('pass')), [...pushT('e', E.str('NOP'))]),",
    ["      S.If(E.eq(ck(), E.str('yield')), [",
      "        ...pushT('e', E.str('YIELD')),",
      "        S.If(E.ge(NdN(nd()), E.num(1)), [...pushT('n', Ch(nd(), E.num(0)))], [",
      "          ...addK(E.str('Z'), 'kci'),",
      "          ...pushT('e', E.str('PUSHK'), E.var('kci')),",
      "        ]),",
      "      ]),",
      "      S.If(E.eq(ck(), E.str('pass')), [...pushT('e', E.str('NOP'))]),"].join(NL), 'yield compile');
// generator defs use GDEF
rep("      S.If(E.eq(opKind, E.str('CLASS'))," + NL + "        [...addK(E.join(E.str('#'), NdA(nd())), 'kci')]," + NL + "        [...addK(NdA(nd()), 'kci')]),",
    ["      S.If(E.eq(opKind, E.str('CLASS')),",
      "        [...addK(E.join(E.str('#'), NdA(nd())), 'kci')],",
      "        [...addK(NdA(nd()), 'kci')]),",
      "      S.If(E.eq(NdG(nd()), E.str('g')), [S.set('dgen', E.str('GDEF'))], [S.set('dgen', opKind)]),"].join(NL), 'gd flag');
rep("      ...pushT('d', opKind, E.var('kci'), E.var('lbody')),", "      ...pushT('d', E.var('dgen'), E.var('kci'), E.var('lbody')),", 'gd emit');
// for loops: a generator iterator needs the NCHK probe after NEXT
rep("      ...pushT('j', E.str('NEXT'), E.var('lx'))," + NL + "      ...pushT('l', E.var('lc')),",
    "      ...pushT('j', E.str('NEXT'), E.var('lx'))," + NL + "      ...pushT('e', E.str('NCHK'), E.var('lx'))," + NL + "      ...pushT('l', E.var('lc')),", 'nchk emit');
fs.writeFileSync(C, s);