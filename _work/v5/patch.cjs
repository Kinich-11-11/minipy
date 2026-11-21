const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="L.failAt(E.str('CompilerError: bad task'), E.num(0)),";
const n="L.failAt(E.join(E.str('CompilerError: bad task '), E.join(E.var('ct0'), E.join(E.str('/'), E.item('CtA', E.var('csSp'))))), E.num(0)),";
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('patched'); } else console.log('MISS');
