const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="        ...L.outLine(E.join(E.str('|I='), E.join(E.var('jsi'), E.join(E.str(' C=['), E.join(E.var('jsc'), E.str(']')))))),"
const B="        ...L.outLine(E.join(E.str('|I='), E.join(E.var('jsi'), E.join(E.str(' root=['), E.join(E.var('jsroot'), E.join(E.str('] D='), E.var('jsd'))))))),"
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('probe updated'); } else console.log('MISS');
fs.writeFileSync(P,c);