const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
const Q='D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); const b2=b.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
rep("      S.If(E.eq(op(), E.str('*')), [S.set('res', E.mul(E.var('na'), E.var('nb')))]),", "      S.If(E.eq(op(), E.str('*')), [\n        S.If(E.and(E.and(E.ge(E.var('na'), E.num(1)), E.eq(E.mod(E.var('na'), E.num(1)), E.num(0))),\n          E.and(E.ge(E.var('nb'), E.num(1)), E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)),\n            E.gt(E.add(E.slen(E.join(E.str(''), E.var('na'))), E.slen(E.join(E.str(''), E.var('nb')))), E.num(15))))), [\n          ...bigMul(E.join(E.str(''), E.var('na')), E.join(E.str(''), E.var('nb')), 'res'),\n        ], [\n          S.set('res', E.mul(E.var('na'), E.var('nb'))),\n        ]),\n      ]),", 'mul');
rep("      S.If(E.eq(op(), E.str('**')), [\n        S.If(E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)), E.le(E.math('abs', E.var('nb')), E.num(1000))), [", "      S.If(E.eq(op(), E.str('**')), [\n        S.If(E.and(E.and(E.ge(E.var('na'), E.num(2)), E.eq(E.mod(E.var('na'), E.num(1)), E.num(0))),\n          E.and(E.ge(E.var('nb'), E.num(1)), E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)),\n            E.and(E.le(E.var('nb'), E.num(512)),\n              E.le(E.mul(E.slen(E.join(E.str(''), E.var('na'))), E.var('nb')), E.num(1024)))))), [\n          ...bigPow(E.join(E.str(''), E.var('na')), E.var('nb'), 'res'),\n        ], [\n        S.If(E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)), E.le(E.math('abs', E.var('nb')), E.num(1000))), [", 'pow');
rep("          ], [L.failAt(E.str('ValueError: bad power'), E.var('pc'))]),\n        ]),\n      ]),", "          ], [L.failAt(E.str('ValueError: bad power'), E.var('pc'))]),\n        ]),\n        ]),\n      ]),", 'powtail');
fs.writeFileSync(P,c);
let d=fs.readFileSync(Q,'utf8');
const A="'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc',";
if(d.indexOf(A)>=0){ d=d.replace(A, "'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc', 'Big',"); console.log('Big list added'); } else bad.push('biglist');
fs.writeFileSync(Q,d);
console.log('applied',n,'missed:',JSON.stringify(bad));