const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/lex.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(String.fromCharCode(13)+NL), b2=b.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// 1) record a second top-level 'for' instead of bailing
rep("                    S.If(E.eq(E.var('cbf'), E.num(0)), [S.set('cbf', E.var('cbj'))], [S.set('cbok', E.num(1))]),",
    "                    S.If(E.eq(E.var('cbf'), E.num(0)), [S.set('cbf', E.var('cbj'))], ["+NL+"                      S.If(E.eq(E.var('cbf2'), E.num(0)), [S.set('cbf2', E.var('cbj'))], [S.set('cbok', E.num(1))]),"+NL+"                    ]),", 'for2');
// 2) init cbf2
rep("S.set('cbf', E.num(0)), S.set('cbif', E.num(0)),", "S.set('cbf', E.num(0)), S.set('cbf2', E.num(0)), S.set('cbif', E.num(0)),", 'init');
// 3) find the second ' in ' (needed for the nested form)
const A=["        S.If(E.eq(E.var('cbok'), E.num(1)), ["].join(NL);
const B=["        S.set('cbi2', E.add(E.var('cbf2'), E.num(3))), S.set('cbok', E.num(0)),"+NL+"        S.If(E.gt(E.var('cbf2'), E.num(0)), ["+NL+"          S.Until(E.or(E.gt(E.var('cbi2'), E.var('cbj')), E.eq(E.var('cbok'), E.num(1))), ["+NL+"            S.If(E.eq(E.join(ch(E.var('cbi2')), E.join(ch(E.add(E.var('cbi2'), E.num(1))), E.join(ch(E.add(E.var('cbi2'), E.num(2))), ch(E.add(E.var('cbi2'), E.num(3)))))), E.str(' in ')), ["+NL+"              S.set('cbok', E.num(1)),"+NL+"            ], [S.chg('cbi2', E.num(1))]),"+NL+"          ]),"+NL+"        ], [S.set('cbok', E.num(1))]),"+NL+A].join(NL);
rep(A, B, 'in2');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));