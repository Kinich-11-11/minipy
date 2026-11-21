const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A=["        S.If(E.eq(E.var('mname'), E.str('startswith|0000000000')), [...swBlock(true)]),",
  "        ...substrInto(E.var('na'), E.var('i'), E.add(E.sub(E.var('jsl'), E.var('i')), E.num(1)), 'out'),",
  "        S.set('res2', E.join(E.str('S'), E.var('out'))),",
  "      ]),",
  "      S.If(E.eq(E.var('mname'), E.str('startswith|0000000000')), [...swBlock(true)]),"].join(NL);
const B="      S.If(E.eq(E.var('mname'), E.str('startswith|0000000000')), [...swBlock(true)]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('leftovers removed'); } else console.log('MISS');
fs.writeFileSync(P,c);