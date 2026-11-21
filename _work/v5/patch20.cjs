const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'compiler.js','utf8');
const o="      S.If(E.eq(ck(), E.str('global')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('GLOBAL'), E.var('kci'))]),";
const n="      S.If(E.eq(ck(), E.str('glob')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('GLOBAL'), E.var('kci'))]),";
if(c.includes(o)){ fs.writeFileSync(P+'compiler.js', c.split(o).join(n)); console.log('global kind fixed'); } else console.log('MISS');
