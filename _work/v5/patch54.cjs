const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8');
const A="S.If(E.and(E.eq(NdN(nd()), E.num(3)), E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),";
const B="S.If(E.and(E.eq(NdN(nd()), E.num(4)), E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('NdN fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);