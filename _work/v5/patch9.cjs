const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
// classBlock's frame must resume AFTER the CLASS instruction
const o="      ...L.setAt('FrKind', E.var('frTop'), E.str('C'))," + String.fromCharCode(10) + "      ...L.setAt('FrRet', E.var('frTop'), E.var('pc')),";
const n="      ...L.setAt('FrKind', E.var('frTop'), E.str('C'))," + String.fromCharCode(10) + "      ...L.setAt('FrRet', E.var('frTop'), E.add(E.var('pc'), E.num(1))),";
if(c.includes(o)){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('class FrRet fixed'); } else console.log('MISS');
