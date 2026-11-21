const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
const N=String.fromCharCode(10);
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="              ...doLabel(E.var('car')),";
const n="              ...L.outLine(E.join(E.str('DBGL lab='), E.join(E.var('car'), E.join(E.str(' pc='), E.add(E.len('Iop'), E.num(1))))))," + N + o;
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('dbg added'); } else console.log('MISS');
