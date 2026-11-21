const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8');
const A="      ...pushT('s', Ch(nd(), E.num(0))),"+NL+"      ...pushT('j', E.str('NEXT'), E.var('lx')),";
const B="      S.If(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('tuple')), E.gt(NdN(Ch(nd(), E.num(0))), E.num(1))), [\n        S.set('tgu', Ch(nd(), E.num(0))),\n        ...pushT('e', E.str('DELV'), E.str('__up|0000')),\n        S.set('i', E.sub(NdN(E.var('tgu')), E.num(1))),\n        S.Until(E.lt(E.var('i'), E.num(0)), [\n          ...pushT('s', Ch(E.var('tgu'), E.var('i'))),\n          ...pushT('e', E.str('SUBS'), E.str('i')),\n          ...addK(E.var('i'), 'kci2'),\n          ...pushT('e', E.str('PUSHK'), E.var('kci2')),\n          ...pushT('e', E.str('PUSHV'), E.str('__up|0000')),\n          S.chg('i', E.num(-1)),\n        ]),\n        ...pushT('e', E.str('STOREV'), E.str('__up|0000')),\n      ], [\n        ...pushT('s', Ch(nd(), E.num(0))),\n      ]),"+NL+"      ...pushT('j', E.str('NEXT'), E.var('lx')),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('for-target unpack added'); } else console.log('MISS');
fs.writeFileSync(P,c);