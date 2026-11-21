const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="        S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),"+String.fromCharCode(10)+"        S.Until(E.or(E.gt(E.var('jsi'), E.slen(E.var('jt'))), E.not(ws(E.var('jsc')))), ["
const B="        S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),"+String.fromCharCode(10)+"        ...L.outLine(E.join(E.str('|I='), E.join(E.var('jsi'), E.join(E.str(' C=['), E.join(E.var('jsc'), E.str(']')))))),"+String.fromCharCode(10)+"        S.Until(E.or(E.gt(E.var('jsi'), E.slen(E.var('jt'))), E.not(ws(E.var('jsc')))), ["
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else console.log('MISS');
fs.writeFileSync(P,c); console.log('dbg',n);