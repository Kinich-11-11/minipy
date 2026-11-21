const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); const b2=b.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
const A="          ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0),"+String.fromCharCode(10)+"        ]),"+String.fromCharCode(10)+"      ]),";
const B="          ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0),"+String.fromCharCode(10)+"        ]),"+String.fromCharCode(10)+"        ]),"+String.fromCharCode(10)+"      ]),";
rep(A,B,'close');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));