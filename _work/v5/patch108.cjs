const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const BAD="      S.If(E.eq(E.var('obj'), E.str('S!time')), [\n        S.If(E.eq(E.var('mname'), E.str('time|0000')), [\n          S.set('res2', E.join(E.str(''), E.add(E.num(946684800), E.mul(E.days2000(), E.num(86400))))),\n        ]),\n      ]),\n";
if(c.indexOf(BAD)>=0){ c=c.replace(BAD,''); console.log('removed misplaced branch'); } else console.log('MISS remove');
const anchor="      S.If(E.eq(E.var('obj'), E.str('S!math')), ["+NL+"        S.If(E.eq(E.var('mname'), E.str('sqrt|0000')),";
if(c.indexOf(anchor)>=0){ c=c.replace(anchor, "      S.If(E.eq(E.var('obj'), E.str('S!time')), [\n        S.If(E.eq(E.var('mname'), E.str('time|0000')), [\n          S.set('res2', E.join(E.str(''), E.add(E.num(946684800), E.mul(E.days2000(), E.num(86400))))),\n        ]),\n      ]),\n"+"      S.If(E.eq(E.var('obj'), E.str('S!math')), ["+NL+"        S.If(E.eq(E.var('mname'), E.str('sqrt|0000')),"); console.log('inserted into methBlock'); } else console.log('MISS anchor');
fs.writeFileSync(P,c);