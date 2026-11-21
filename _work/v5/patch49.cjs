const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let c=fs.readFileSync(P,'utf8');
const A="newVars[nid] = ['t' + slotCount, varsDict[v][1]];";
const B="newVars[nid] = ['v5reg' + slotCount, varsDict[v][1]];";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('pooled names are now unique'); } else console.log('MISS');
fs.writeFileSync(P,c);