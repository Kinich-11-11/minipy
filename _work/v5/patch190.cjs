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
rep("const { EXCNAMES } = require('./vm.js');", "const { EXCNAMES, key } = require('./vm.js');" + NL + "const SKNAME = key('__sortpairs');", 'sortpairs name');
rep("  function compNext() {", "  // ---------------- sorted(x, key=f) ----------------\n  // A builtin cannot call a user function, so the compiler builds the (key, value) pairs\n  // itself and hands them to the __sortpairs builtin, which sorts by the first element.\n  // Supported shapes: sorted(X, key=K) and sorted(X, key=K, reverse=R).\n  function compKeySort() {\n    const nd = () => E.var('cnd');\n    return [\n      S.chg('labTop', E.num(2)),\n      S.set('lcl', E.sub(E.var('labTop'), E.num(1))),\n      S.set('lce', E.var('labTop')),\n      ...pushT('e', E.str('DELV'), E.str('__ksp')),\n      ...pushT('e', E.str('DELV'), E.str('__ksv')),\n      ...pushT('e', E.str('DELV'), E.str('__ksr')),\n      ...pushT('e', E.str('CALL'), E.str(',|3')),\n      S.If(E.eq(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))], [\n        ...addK(E.str('B0'), 'kci'),\n        ...pushT('e', E.str('PUSHK'), E.var('kci')),\n      ]),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksr')),\n      ...pushT('e', E.str('PUSHV'), E.str(SKNAME)),\n      ...pushT('e', E.str('STOREV'), E.str('__ksr')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('l', E.var('lce')),\n      ...pushT('j', E.str('JMP'), E.var('lcl')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),\n      ...pushT('e', E.str('BUILD'), E.str('T|2')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),\n      ...pushT('e', E.str('CALL'), E.str(',|2')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),\n      ...pushT('n', Ch(nd(), E.num(2))),\n      ...pushT('e', E.str('STOREV'), E.str('__ksv')),\n      ...pushT('j', E.str('NCHK'), E.var('lce')),\n      ...pushT('j', E.str('NEXT'), E.var('lce')),\n      ...pushT('l', E.var('lcl')),\n      ...pushT('e', E.str('ITER')),\n      ...pushT('n', Ch(nd(), E.num(1))),\n      ...pushT('e', E.str('STOREV'), E.str('__ksp')),\n      ...pushT('e', E.str('BUILD'), E.str('L|0')),\n    ];\n  }\n  function compNext() {", 'compKeySort');
rep("            ...compNext()," + NL + "          ], [" + NL + "            ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0)," + NL + "          ]),",
    ["            ...compNext(),",
     "          ], [",
     "          S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),",
     "            E.eq(NdA(Ch(nd(), E.num(0))), E.str('sorted|000000'))),",
     "            E.and(E.contains(NdA(nd()), E.str('key|000')),",
     "              E.or(E.eq(NdN(nd()), E.num(3)), E.and(E.eq(NdN(nd()), E.num(4)), E.contains(NdA(nd()), E.str('reverse|0000000')))))), [",
     "            ...compKeySort(),",
     "          ], [",
     "            ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0),",
     "          ]),",
     "          ]),"].join(NL), 'keysort hook');
fs.writeFileSync(C, s);