const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
const N=String.fromCharCode(10);
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="                ...doDef(E.var('cop'), E.var('car'), E.var('ca2')),";
const n="                ...L.outLine(E.join(E.str('DBGD '), E.join(E.var('cop'), E.join(E.str(' k='), E.join(E.var('car'), E.join(E.str(' lab='), E.join(E.var('ca2'), E.join(E.str(' pc='), E.item('Lpc', E.var('ca2'))))))))))," + N + o;
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('dbg added'); } else console.log('MISS');
