const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(String.fromCharCode(13)+NL), b2=b.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// dict entries must be pushed newest-first so they pop in insertion order
rep("            S.set('wi', E.len('WB')),"+NL+"            S.Until(E.lt(E.var('wi'), E.num(1)), [", "            S.set('wi', E.num(1)),"+NL+"            S.Until(E.gt(E.var('wi'), E.len('WB')), [", 'start');
rep("              S.If(E.gt(E.var('wi'), E.num(1)), [S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str(', '))]),"+NL+"              S.chg('wi', E.num(-1)),"+NL+"            ]),"+NL+"            S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str('{')),", "              S.If(E.lt(E.var('wi'), E.len('WB')), [S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str(', '))]),"+NL+"              S.chg('wi', E.num(1)),"+NL+"            ]),"+NL+"            S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str('{')),", 'comma');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));