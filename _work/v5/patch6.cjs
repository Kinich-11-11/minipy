const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const a="      S.If(E.eq(E.var('mname'), E.str('keys|0000')), [...kvBlock(false)]),";
if(!c.includes(a)){ console.log('ANCHOR MISS'); process.exit(1); }
c=c.split(a).join("      S.If(E.eq(E.var('mname'), E.str('format|000000')), [\n        S.set('out', E.str('')), S.set('i', E.num(1)), S.set('ai2', E.num(2)), S.set('skp', E.num(0)),\n        S.Repeat(E.slen(E.var('na')), [\n          S.set('cch', E.letter(E.var('i'), E.var('na'))),\n          S.If(E.eq(E.var('cch'), E.str('{')), [\n            S.set('skp', E.num(1)),\n            ...tostr(E.item('Stk', E.add(E.var('ubase'), E.var('ai2'))), 'ex2'),\n            S.set('out', E.join(E.var('out'), E.var('ex2'))),\n            S.set('ai2', E.add(E.var('ai2'), E.num(1))),\n          ], [\n            S.If(E.eq(E.var('cch'), E.str('}')), [S.set('skp', E.num(0))], [\n              S.If(E.eq(E.var('skp'), E.num(0)), [S.set('out', E.join(E.var('out'), E.var('cch')))]),\n            ]),\n          ]),\n          S.chg('i', E.num(1)),\n        ]),\n        S.set('res2', E.join(E.str('S'), E.var('out'))),\n      ]),\n      S.If(E.eq(E.var('mname'), E.str('keys|0000')), [...kvBlock(false)]),");
fs.writeFileSync(P+'vm.js', c);
console.log('format added');
