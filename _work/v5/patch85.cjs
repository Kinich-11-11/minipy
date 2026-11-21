const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A=["        S.If(E.and(E.eq(E.item('BlK', E.var('blSp')), E.str('try')),",
  "          E.or(E.or(E.eq(E.var('t5'), E.str('except')), E.eq(E.var('t5'), E.str('finally'))),",
  "            E.eq(E.var('t5'), E.str('else'))))), [S.set('t6', E.num(1))]),"].join(NL);
const B=["        S.If(E.and(E.eq(E.item('BlK', E.var('blSp')), E.str('try')),",
  "          E.or(E.or(E.eq(E.var('t5'), E.str('except')), E.eq(E.var('t5'), E.str('finally'))),",
  "            E.eq(E.var('t5'), E.str('else')))), [S.set('t6', E.num(1))]),"].join(NL);
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('parens fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);