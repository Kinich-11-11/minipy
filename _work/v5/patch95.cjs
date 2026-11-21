const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A="  function inComma() {\n    return [\n      S.set('t6', P.ctxT()),";
const B="  function inComma() {\n    return [\n      // fold the operators pending for the element that just ended (same reason as inColon)\n      S.If(E.not(E.eq(P.ctxT(), E.str('S'))), [S.Until(E.le(E.var('poSp'), P.ctxB()), [P.reduceOne()])]),\n      S.set('t6', P.ctxT()),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('inComma reduce added'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('added crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);