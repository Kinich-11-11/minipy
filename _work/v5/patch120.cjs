const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="        S.If(E.le(E.var('jsi'), E.slen(E.var('jt'))), ["
const B="        ...L.outLine(E.join(E.str('|END root=['), E.join(E.var('jsroot'), E.str(']')))),"+String.fromCharCode(10)+A
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else console.log('MISS');
fs.writeFileSync(P,c); console.log('probe',n);