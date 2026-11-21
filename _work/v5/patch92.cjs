const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="    S.set('ri', E.add(ixExpr, E.num(1))),"+String.fromCharCode(10)+"    S.Until(E.gt(E.var('ri'), E.item('LCount', obj)), ["+String.fromCharCode(10)+"      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(1))), heapGet(obj, E.var('ri'))),";
const B="    S.set('ri', E.add(ixExpr, E.num(2))),"+String.fromCharCode(10)+"    S.Until(E.gt(E.var('ri'), E.item('LCount', obj)), ["+String.fromCharCode(10)+"      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(2))), heapGet(obj, E.var('ri'))),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; console.log('removeAt shift fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);