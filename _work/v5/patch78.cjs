const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/pexpr.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// precedence: 'else' below 'if' below everything else
rep("    S.If(E.eq(oExpr, E.str('**')), [S.set(dst, E.num(12))]),",
    "    S.If(E.eq(oExpr, E.str('**')), [S.set(dst, E.num(12))]),"+NL+"    S.If(E.eq(oExpr, E.str('if')), [S.set(dst, E.num(-1))]),"+NL+"    S.If(E.eq(oExpr, E.str('else')), [S.set(dst, E.num(-2))]),", 'prec');
// reduceOne: 'if' -> ifpart, 'else' -> tern
const OLD=["      S.set('nc0', E.num(2)),",
  "      S.If(E.and(isCmp(E.var('o0')), E.eq(E.item('NdK', E.var('l0')), E.str('cmp'))), [",
  "        S.set('nc0', E.num(3)),",
  "      ]),",
  "      S.If(E.eq(E.var('nc0'), E.num(3)), [",
  "        ...extendCmp(),",
  "      ], [",
  "        ...A.nodeN('t3', E.str('bin'), E.var('o0'), [E.var('l0'), E.var('r0')]),",
  "        ...pushV(E.var('t3'), E.str('')),",
  "      ]),"].join(NL);
const NEW=["      S.If(E.eq(E.var('o0'), E.str('if')), [",
  "        ...A.nodeN('t3', E.str('ifpart'), E.str(''), [E.var('l0'), E.var('r0')]),",
  "        ...pushV(E.var('t3'), E.str('')),",
  "      ], [",
  "        S.If(E.eq(E.var('o0'), E.str('else')), [",
  "          S.chg('nTop', E.num(1)), S.set('t3', E.var('nTop')),",
  "          ...L.setAt('NdK', E.var('t3'), E.str('tern')),",
  "          ...L.setAt('NdA', E.var('t3'), E.str('')),",
  "          ...L.setAt('NdS', E.var('t3'), E.add(E.len('NdC'), E.num(1))),",
  "          S.ladd('NdC', E.item('NdC', E.item('NdS', E.var('l0')))),",
  "          S.ladd('NdC', E.item('NdC', E.add(E.item('NdS', E.var('l0')), E.num(1)))),",
  "          S.ladd('NdC', E.var('r0')),",
  "          ...L.setAt('NdN', E.var('t3'), E.num(3)),",
  "          ...pushV(E.var('t3'), E.str('')),",
  "        ], [",
  "          S.set('nc0', E.num(2)),",
  "          S.If(E.and(isCmp(E.var('o0')), E.eq(E.item('NdK', E.var('l0')), E.str('cmp'))), [",
  "            S.set('nc0', E.num(3)),",
  "          ]),",
  "          S.If(E.eq(E.var('nc0'), E.num(3)), [",
  "            ...extendCmp(),",
  "          ], [",
  "            ...A.nodeN('t3', E.str('bin'), E.var('o0'), [E.var('l0'), E.var('r0')]),",
  "            ...pushV(E.var('t3'), E.str('')),",
  "          ]),",
  "        ]),",
  "      ]),"].join(NL);
rep(OLD, NEW, 'reduce');
fs.writeFileSync(P,c); console.log('pexpr applied',n,'missed:',JSON.stringify(bad));