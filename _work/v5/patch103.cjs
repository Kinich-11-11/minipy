const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8');
const A="                  // first top-level ':' before the 'for' separates key and value in a dict comp\n                  S.If(E.and(E.eq(E.var('cbf'), E.num(0)), E.and(E.eq(E.var('cbc'), E.num(0)), E.eq(E.var('cbt'), E.str(':')))), [\n                    S.set('cbc', E.var('cbj')),\n                  ]),\n                ]),\n                S.chg('cbj', E.num(1)),";
const B="                ]),\n                // first top-level ':' before the 'for' separates key and value in a dict comp\n                S.If(E.and(E.eq(E.var('cbd'), E.num(1)), E.and(E.eq(E.var('cbf'), E.num(0)),\n                  E.and(E.eq(E.var('cbc'), E.num(0)), E.eq(E.var('cbt'), E.str(':'))))), [\n                  S.set('cbc', E.var('cbj')),\n                ]),\n                S.chg('cbj', E.num(1)),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('colon detection moved'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('moved crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);