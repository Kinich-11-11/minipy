const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="          S.Until(E.le(E.var('j'), E.num(1)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),";
const n="          S.Until(E.lt(E.var('j'), E.num(1)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),";
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('arg loop fixed'); } else console.log('MISS');
