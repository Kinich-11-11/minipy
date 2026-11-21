const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="        ], [\n          ...num1('na', 2), ...drop(), ...vpush(E.join(E.str(''), E.rnd(E.var('na')))),\n        ]),";
const B="        ], [\n          // Python's int() truncates toward zero (Scratch's round() would round half up)\n          ...num1('na', 2), ...drop(),\n          S.set('na2', E.math('floor', E.var('na'))),\n          S.If(E.lt(E.var('na'), E.num(0)), [S.set('na2', E.math('ceiling', E.var('na')))]),\n          ...vpush(E.join(E.str(''), E.var('na2'))),\n        ]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('int truncates'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('ok crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);