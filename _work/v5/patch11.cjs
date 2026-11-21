const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const o="      ...lookupIn(E.item('ClMap', E.var('clo')), E.str('__init__|00000000'), 'mif'),";
const n="      ...lookupIn(E.item('ClMap', E.var('clo')), E.str('__init__|00000000'), 'mif')," + String.fromCharCode(10) +
  "      ...L.outLine(E.join(E.str('DBG mif='), E.join(E.var('mif'), E.join(E.str(' fb='), E.join(E.item('FnBody', E.var('mif')), E.join(E.str(' cm='), E.item('ClMap', E.var('clo')))))))),";
if(c.includes(o)){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('dbg added'); } else console.log('MISS');
