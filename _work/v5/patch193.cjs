const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(C, 'utf8');
const a = '  // ---------------- sorted(x, key=f) ----------------';
const b = '  function compNext() {';
const i = s.indexOf(a), j = s.indexOf(b, i);
if (i < 0 || j < 0) { console.log('MISS ' + i + ' ' + j); process.exit(1); }
fs.writeFileSync(C, s.slice(0, i) + '  // ---------------- sorted(x, key=f) ----------------\n  // A builtin cannot call a user function, so the compiler builds the (key, value) pairs\n  // itself and hands them to the __sortpairs builtin, which sorts by the first element.\n  // Supported shapes: sorted(X, key=K) and sorted(X, key=K, reverse=R).\n  // METH wants the object BELOW its arguments, so the accumulator is pushed before the key\n  // call: stack [it, ix, pairs, kval, elem] -> BUILD T|2 -> [it, ix, pairs, pair] -> append.\n  function compKeySort() {\n    const nd = () => E.var('cnd');\n    return [\n      S.chg('labTop', E.num(2)),\n      S.set('lcl', E.sub(E.var('labTop'), E.num(1))),\n      S.set('lce', E.var('labTop')),\n      ...pushT('e', E.str('DELV'), E.str('__ksp')),\n      ...pushT('e', E.str('DELV'), E.str('__ksv')),\n      ...pushT('e', E.str('DELV'), E.str('__ksr')),\n      ...pushT('e', E.str('CALL'), E.str(',|3')),\n      S.If(E.eq(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))], [\n        ...addK(E.str('B0'), 'kci'),\n        ...pushT('e', E.str('PUSHK'), E.var('kci')),\n      ]),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksr')),\n      ...pushT('e', E.str('PUSHV'), E.str(SKNAME)),\n      ...pushT('e', E.str('STOREV'), E.str('__ksr')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('l', E.var('lce')),\n      ...pushT('j', E.str('JMP'), E.var('lcl')),\n      ...pushT('e', E.str('POP')),\n      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),\n      ...pushT('e', E.str('BUILD'), E.str('T|2')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),\n      ...pushT('e', E.str('CALL'), E.str(',|2')),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),\n      ...pushT('n', Ch(nd(), E.num(2))),\n      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),\n      ...pushT('e', E.str('STOREV'), E.str('__ksv')),\n      ...pushT('j', E.str('NCHK'), E.var('lce')),\n      ...pushT('j', E.str('NEXT'), E.var('lce')),\n      ...pushT('l', E.var('lcl')),\n      ...pushT('e', E.str('ITER')),\n      ...pushT('n', Ch(nd(), E.num(1))),\n      ...pushT('e', E.str('STOREV'), E.str('__ksp')),\n      ...pushT('e', E.str('BUILD'), E.str('L|0')),\n    ];\n  }\n' + s.slice(j));
console.log('compKeySort rewritten');
let v = fs.readFileSync(V, 'utf8');
const ps = v.indexOf("        ...L.outLine(E.join(E.str('SPDBG a1=[')");
const pe = v.indexOf("        S.set('rvs', E.num(0)),", ps);
if (ps < 0 || pe < 0) { console.log('MISS probe ' + ps + ' ' + pe); process.exit(1); }
fs.writeFileSync(V, v.slice(0, ps) + v.slice(pe));
console.log('probe removed');