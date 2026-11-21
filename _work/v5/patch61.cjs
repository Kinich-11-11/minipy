const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="            S.chg(E.num ? E.str('i') : E.str('i'), E.num(1)),";
const B="            S.chg('i', E.num(1)),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);