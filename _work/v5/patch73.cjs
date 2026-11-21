const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
// 1) remove the debug lines
const dbg=["          ...L.outLine(E.join(E.str('|CB le=['), E.join(E.var('le'), E.str(']')))),","          ...L.outLine(E.join(E.str('|CB cbf='), E.join(E.var('cbf'), E.join(E.str(' cbif='), E.join(E.var('cbif'), E.join(E.str(' cbok='), E.var('cbok'))))))),","          ...L.outLine(E.join(E.str('|CB cbi='), E.join(E.var('cbi'), E.join(E.str(' cbj='), E.var('cbj'))))),","          ...L.outLine(E.join(E.str('|CB cbn=['), E.join(E.var('cbn'), E.str(']')))),"];
for(const d of dbg){ const i=c.indexOf(d); if(i>=0){ const ls=c.lastIndexOf(String.fromCharCode(10), i); const le=c.indexOf(String.fromCharCode(10), i); c=c.slice(0,ls+1)+c.slice(le+1); n++; } else bad.push('dbg'); }
// 2) iterable ends at the 'if' when there is a filter
const A="          ...copy(E.var('le'), E.add(E.var('cbi'), E.num(4)), E.sub(E.var('cbj'), E.add(E.var('cbi'), E.num(4))), 'cbt'),";
const B="          S.set('cbe', E.var('cbj')),"+String.fromCharCode(10)+"          S.If(E.gt(E.var('cbif'), E.num(0)), [S.set('cbe', E.sub(E.var('cbif'), E.num(1)))]),"+String.fromCharCode(10)+"          ...copy(E.var('le'), E.add(E.var('cbi'), E.num(4)), E.sub(E.var('cbe'), E.add(E.var('cbi'), E.num(4))), 'cbt'),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else bad.push('iter');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));