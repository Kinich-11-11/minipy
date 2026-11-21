const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const o="      ...dispatch(),", n="      S.If(E.eq(E.item('Code', E.num(1)), E.str('#!trace')), [\n        ...L.outLine(E.join(E.var('pc'), E.join(E.str(' '), E.join(E.var('op'), E.join(E.str(' sp='), E.join(E.var('sp'), E.join(E.str(' fr='), E.join(E.var('frTop'), E.join(E.str(' st='), E.var('sp')))))))))),\n      ]),\n      ...dispatch(),";
const cnt=c.split(o).length-1;
console.log('occurrences', cnt);
if(cnt===1){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('trace added'); } else console.log('MISS');
