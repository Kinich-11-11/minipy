const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8');
const A=["      S.If(E.ge(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))]),",
  "      ...pushT('l', E.var('lb')),"].join(NL);
const B=["      ...pushT('l', E.var('lb')),",
  "      S.If(E.ge(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))]),"].join(NL);
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('for/else order fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);