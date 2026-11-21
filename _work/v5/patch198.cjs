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
// payInto strips the tag, so compare boolean truthiness of the RAW value instead
rep("            ...L.payInto(arg(3), 'rvv')," + NL + "            S.If(E.eq(E.var('rvv'), E.str('B1')), [S.set('revs', E.num(1))]),",
    "            ...truthOf(arg(3), 'rvv')," + NL + "            S.If(E.eq(E.var('rvv'), E.num(1)), [S.set('revs', E.num(1))]),", 'sorted reverse');
rep("        ...L.payInto(arg(3), 'rv')," + NL + "        S.set('rvs', E.num(0))," + NL + "        S.If(E.eq(E.var('rv'), E.str('B1')), [S.set('rvs', E.num(1))]),",
    "        S.set('rvs', E.num(0))," + NL + "        ...truthOf(arg(3), 'rv')," + NL + "        S.If(E.eq(E.var('rv'), E.num(1)), [S.set('rvs', E.num(1))]),", 'sortpairs reverse');
fs.writeFileSync(V, v);