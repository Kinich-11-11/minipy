const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="          S.If(E.eq(E.var('jsnew'), E.num(1)), [\n            S.chg('jsd', E.num(1)),\n            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),\n          ]),\n          ]),\n        ]),\n      ]),";
const B="          S.If(E.eq(E.var('jsnew'), E.num(1)), [\n            S.chg('jsd', E.num(1)),\n            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),\n          ]),\n        ]),\n      ]),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('stray removed'); } else console.log('MISS');
fs.writeFileSync(P,c);