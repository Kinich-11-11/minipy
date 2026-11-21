const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8');
const A="          S.set('cbwr', E.num(1)),";
const B=A+String.fromCharCode(10)+"          ...L.outLine(E.join(E.str('|CB le=['), E.join(E.var('le'), E.str(']')))),"+String.fromCharCode(10)+"          ...L.outLine(E.join(E.str('|CB cbf='), E.join(E.var('cbf'), E.join(E.str(' cbif='), E.join(E.var('cbif'), E.join(E.str(' cbok='), E.var('cbok'))))))),"+String.fromCharCode(10)+"          ...L.outLine(E.join(E.str('|CB cbi='), E.join(E.var('cbi'), E.join(E.str(' cbj='), E.var('cbj'))))),"+String.fromCharCode(10)+"          ...L.outLine(E.join(E.str('|CB cbn=['), E.join(E.var('cbn'), E.str(']')))),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('dbg added'); } else console.log('MISS');
fs.writeFileSync(P,c);