const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="        ...nthField(E.var('kws'), E.var('f2'), 'knm2'),";
const B="        ...nthField(E.var('cai'), E.var('f2'), 'knm2'),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('cai used'); } else console.log('MISS');
fs.writeFileSync(P,c);