const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const o = "        ], [" + "\n" +
  "          S.If(E.eq(E.var('idx'), E.str('Z')), [S.set('ilo', E.sub(E.var('ln'), E.num(1)))])," + "\n" +
  "          S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))])," + "\n" +
  "        ]),";
const n = "        ], [" + "\n" +
  "          S.If(E.eq(E.var('idx'), E.str('Z')), [S.set('ilo', E.sub(E.var('ln'), E.num(1)))])," + "\n" +
  "          S.If(E.eq(E.var('vhi'), E.str('Z')), [S.set('ihi', E.num(-1))])," + "\n" +
  "          S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))])," + "\n" +
  "          S.If(E.lt(E.var('ihi'), E.num(0)), [S.set('ihi', E.add(E.var('ihi'), E.num(0)))])," + "\n" +
  "        ]),";
if(c.includes(o)){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('neg slice fixed'); } else console.log('MISS');
