const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const o="        S.If(E.or(E.eq(E.var('frTop'), E.num(1)), E.eq(E.var('isg'), E.num(1))), [\r\n", n="        ...L.outLine(E.join(E.str('DBGS isg='), E.join(E.var('isg'), E.join(E.str(' n='), E.join(ia(), E.join(E.str(' fg='), E.item('FrGlob', E.var('frTop')))))))),\r\n        S.If(E.or(E.eq(E.var('frTop'), E.num(1)), E.eq(E.var('isg'), E.num(1))), [\r\n";
if(c.includes(o)){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('dbg added'); } else console.log('MISS');
