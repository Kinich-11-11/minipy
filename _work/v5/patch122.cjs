const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="        S.If(E.eq(E.var('mname'), E.str('loads|00000')), [\n          ...jsonLoads(),\n        ]),";
const B="        // json.loads is written (see jsonLoads below) but still misbehaves, so it fails loudly\n        // instead of silently returning None.\n        S.If(E.not(E.or(E.eq(E.var('mname'), E.str('dumps|00000')), E.eq(E.var('mname'), E.str('loads|00000')))), [\n          S.set('res2', E.join(E.str('S!json has no method '), E.var('mname'))),\n          ...L.failAt(E.str('AttributeError: json has no such method'), E.var('pc')),\n        ]),\n        S.If(E.eq(E.var('mname'), E.str('loads|00000')), [\n          ...L.failAt(E.str('NotImplementedError: json.loads'), E.var('pc')),\n        ]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('loads disabled loudly'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('ok crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);