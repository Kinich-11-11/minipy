const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A="          E.and(E.eq(E.var('pc0'), E.var('pr0')), E.not(E.eq(opExpr, E.str('**'))))), [";
const B="          E.and(E.eq(E.var('pc0'), E.var('pr0')), E.not(E.or(E.eq(opExpr, E.str('**')), E.eq(opExpr, E.str('else')))))), [";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('right-assoc fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);