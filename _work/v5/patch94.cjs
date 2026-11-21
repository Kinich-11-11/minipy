const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let c=fs.readFileSync(P,'utf8');
const A="  function inColon() {\n    return [\n      S.set('t6', P.ctxT()),";
const B="  function inColon() {\n    return [\n      // fold any operators still pending for the part that just ended, otherwise the next\n      // part's operators stack on top of them and reduce in the wrong order\n      S.Until(E.le(E.var('poSp'), P.ctxB()), [P.reduceOne()]),\n      S.set('t6', P.ctxT()),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('inColon reduce added'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('added crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);