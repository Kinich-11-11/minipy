const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8');
const A="        S.set('c0', ch(E.var('fi'))),"+String.fromCharCode(10)+"        S.If(E.eq(E.var('c0'), E.var('fq')), [";
const B="        S.set('c0', ch(E.var('fi'))),"+String.fromCharCode(10)+"        ...L.outLine(E.join(E.str('|IT fi='), E.join(E.var('fi'), E.join(E.str(' c0=['), E.join(E.var('c0'), E.join(E.str('] fq=['), E.join(E.var('fq'), E.join(E.str('] flit=['), E.join(E.var('flit'), E.str(']'))))))))))),"+String.fromCharCode(10)+"        S.If(E.eq(E.var('c0'), E.var('fq')), [";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('loop dbg added'); } else console.log('MISS');
fs.writeFileSync(P,c);