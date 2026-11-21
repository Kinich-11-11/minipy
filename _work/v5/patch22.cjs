const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
const CR=String.fromCharCode(13,10);
let c=fs.readFileSync(P+'vm.js','utf8');
// remove debug
const dstart="        ...L.outLine(E.join(E.str('DBGS isg=')";
while(true){ const i=c.indexOf(dstart); if(i<0) break; const j=c.indexOf(CR, i); c=c.slice(0,i)+c.slice(j+1); }
// module frame must also occupy FrGlob row 1 so later frames line up
const o="    ...L.setAt('FrAux', E.num(1), E.num(0)),";
const n="    ...L.setAt('FrAux', E.num(1), E.num(0))," + CR + "    ...L.setAt('FrGlob', E.num(1), E.num(0)),";
if(c.includes(o)){ c=c.split(o).join(n); console.log('module FrGlob added'); } else console.log('MISS');
fs.writeFileSync(P+'vm.js', c);
