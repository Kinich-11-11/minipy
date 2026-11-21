const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A=["      S.Until(E.or(E.not(E.eq(T(), E.str('I'))), E.not(E.eq(E.var('err'), E.str('')))), [",
  "        S.set('stS', E.join(E.var('stS'), E.join(E.item('TokV', E.var('tp')), E.str(';')))),",
  "        tp1(),",
  "      ]),",
  "      S.If(isO(','), [tp1()]),"].join(NL);
const B=["      S.Until(E.or(E.not(E.or(E.eq(T(), E.str('I')), isO(','))), E.not(E.eq(E.var('err'), E.str('')))), [",
  "        S.If(E.eq(T(), E.str('I')), [",
  "          S.set('stS', E.join(E.var('stS'), E.join(E.item('TokV', E.var('tp')), E.str(';')))),",
  "          tp1(),",
  "        ], [tp1()]),",
  "      ]),"].join(NL);
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('lambda params fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);