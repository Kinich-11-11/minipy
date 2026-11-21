const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="          S.set('j', NdN(nd()))," + "\n" + "          S.Until(E.le(E.var('j'), E.num(1)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),";
const n="          S.set('j', E.sub(NdN(nd()), E.num(1)))," + "\n" + "          S.Until(E.le(E.var('j'), E.num(1)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),";
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('meth loop fixed'); } else console.log('meth MISS');
