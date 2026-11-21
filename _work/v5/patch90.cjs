const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// replace subsSetBlock wholesale
const A=c.indexOf('  function subsSetBlock() {');
const B=c.indexOf('  function getattrBlock() {');
if(A<0||B<0||B<A){ bad.push('subsset'); } else { c=c.slice(0,A)+"  function subsSetBlock() {\n    return [\n      S.set('obj', E.item('Stk', E.sub(E.var('sp'), E.num(2)))),\n      S.set('idx', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),\n      S.set('val', E.item('Stk', E.var('sp'))),\n      S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('D')), [\n        ...L.payInto(E.var('obj'), 'dmo'), ...keyOf(E.var('idx'), 'kvk'),\n        ...bindSet(E.var('dmo'), E.var('kvk'), E.var('val'), 'fd11'),\n      ], [\n        ...L.payInto(E.var('idx'), 'nidx'),\n        ...L.payInto(E.var('obj'), 'lso'),\n        S.set('ln', E.item('LCount', E.var('lso'))),\n        S.If(E.lt(E.var('nidx'), E.num(0)), [S.set('nidx', E.add(E.var('nidx'), E.var('ln')))]),\n        S.If(E.or(E.lt(E.var('nidx'), E.num(0)), E.ge(E.var('nidx'), E.var('ln'))), [\n          ...raiseBuiltin('IndexError'),\n        ], [\n          S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.var('nidx')), E.var('val')),\n        ]),\n      ]),\n      S.chg('sp', E.num(-3)),\n    ];\n  }"+NL+NL+c.slice(B); n++; }
// guard string count vs list count
rep("      S.If(E.eq(E.var('mname'), E.str('count|00000')), [...findBlock(true)]),", "      S.If(E.and(E.eq(E.var('mname'), E.str('count|00000')), E.eq(E.letter(E.num(1), E.var('obj')), E.str('S'))), [...findBlock(true)]),", 'strcount');
rep("      S.If(E.eq(E.var('mname'), E.str('count|00000')), ["+NL+"        ...L.payInto(E.var('obj'), 'lso'),", "      S.If(E.and(E.eq(E.var('mname'), E.str('count|00000')), E.not(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')))), ["+NL+"        ...L.payInto(E.var('obj'), 'lso'),", 'listcount');
// listRemoveAt off-by-one
rep("      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(1))), heapGet(obj, E.var('ri'))),", "      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(2))), heapGet(obj, E.var('ri'))),", 'removeat');
// index/remove raise ValueError when missing
rep("        ...listFind(E.var('lso'), E.var('a1'), 'res2'),"+NL+"      ]),", "        ...listFind(E.var('lso'), E.var('a1'), 'res2'),"+NL+"        S.If(E.lt(E.var('res2'), E.num(0)), [...raiseBuiltin('ValueError')]),"+NL+"      ]),", 'idxerr');
rep("        S.If(E.ge(E.var('rix'), E.num(0)), [...listRemoveAt(E.var('lso'), E.var('rix'))]),", "        S.If(E.ge(E.var('rix'), E.num(0)), [...listRemoveAt(E.var('lso'), E.var('rix'))], [...raiseBuiltin('ValueError')]),", 'rmerr');
// class attribute lookup
rep("        S.If(E.eq(E.var('obj'), E.str('S!math')), [", "        S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('C')), ["+NL+"          ...L.payInto(E.var('obj'), 'clo2'),"+NL+"          ...lookupIn(E.item('ClMap', E.var('clo2')), ia(), 'gv'),"+NL+"          ...vpush(E.var('gv')),"+NL+"        ], ["+NL+"        S.If(E.eq(E.var('obj'), E.str('S!math')), [", 'clsattr');
rep("          ...L.failAt(E.str('AttributeError'), E.var('pc')),"+NL+"        ]),"+NL+"      ]),"+NL+"    ];"+NL+"  }", "          ...L.failAt(E.str('AttributeError'), E.var('pc')),"+NL+"        ]),"+NL+"        ]),"+NL+"      ]),"+NL+"    ];"+NL+"  }", 'clsclose');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));