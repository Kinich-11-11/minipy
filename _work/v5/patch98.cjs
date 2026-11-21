const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="      S.If(E.eq(bn(), E.str('enumerate|000000000')), [\n        ...L.payInto(arg(2), 'lso'), ...heapNew('tobj'), S.set('i', E.num(1)),";
const B="      S.If(E.eq(bn(), E.str('enumerate|000000000')), [\n        ...L.payInto(arg(2), 'lso'), ...heapNew('tobj'), S.set('i', E.num(1)),\n        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [\n          ...L.payInto(arg(2), 'nstr'),\n          S.Repeat(E.slen(E.var('nstr')), [\n            ...heapNew('tup'),\n            ...heapPush(E.var('tup'), E.join(E.str(''), E.sub(E.var('i'), E.num(1)))),\n            ...heapPush(E.var('tup'), E.join(E.str('S'), E.letter(E.var('i'), E.var('nstr')))),\n            ...heapPush(E.var('tobj'), E.join(E.str('T'), E.var('tup'))),\n            S.chg('i', E.num(1)),\n          ]),\n        ]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('enumerate strings ok'); } else { const a2=A.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,B.split(NL).join(String.fromCharCode(13)+NL)); console.log('ok crlf'); } else console.log('MISS'); }
fs.writeFileSync(P,c);