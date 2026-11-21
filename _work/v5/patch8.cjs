const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="      S.If(E.not(E.eq(opKind, E.str('LAMBDA'))), [...pushT('e', E.str('STOREV'), E.var('dname'))]),\n      ...pushT('d', opKind, E.var('kci'), E.var('lbody')),\n      ...pushT('l', E.var('laft')),\n      ...pushT('e', E.str('RETN')),", n="      S.If(E.not(E.eq(opKind, E.str('LAMBDA'))), [...pushT('e', E.str('STOREV'), E.var('dname'))]),\n      ...pushT('d', opKind, E.var('kci'), E.var('lbody')),\n      ...pushT('l', E.var('laft')),\n      S.If(E.eq(opKind, E.str('CLASS')), [\n        ...pushT('e', E.str('RETN')),\n      ], [\n        ...addK(E.str('Z'), 'kci2'),\n        ...pushT('e', E.str('RET')),\n        ...pushT('e', E.str('PUSHK'), E.var('kci2')),\n      ]),";
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('def falls off end -> RET None'); } else console.log('MISS');
