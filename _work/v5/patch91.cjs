const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(2))), heapGet(obj, E.var('ri'))),";
const B="      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(1))), heapGet(obj, E.var('ri'))),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('removeAt reverted'); } else console.log('MISS');
fs.writeFileSync(P,c);