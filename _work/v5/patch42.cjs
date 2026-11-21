const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8');
const A="      S.set('ln', E.slen(E.var('le'))),";
const B=A+String.fromCharCode(10)+"      ...L.outLine(E.join(E.str('|FOUT=['), E.join(E.var('fout'), E.join(E.str('] LE=['), E.join(E.var('le'), E.str(']')))))),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('dbg added'); } else console.log('MISS');
fs.writeFileSync(P,c);