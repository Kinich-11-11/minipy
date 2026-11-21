const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A="          E.or(E.eq(E.var('t5'), E.str('except')), E.eq(E.var('t5'), E.str('finally')))), [S.set('t6', E.num(1))]),";
const B="          E.or(E.or(E.eq(E.var('t5'), E.str('except')), E.eq(E.var('t5'), E.str('finally'))),"+String.fromCharCode(10)+"            E.eq(E.var('t5'), E.str('else'))))), [S.set('t6', E.num(1))]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('try/else keep fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);