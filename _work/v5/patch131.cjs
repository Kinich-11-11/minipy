const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="            ]),\n          ]),\n          ]),\n          ]),\n          S.If(E.or(E.eq(E.var('jsnew'), E.num(1)), E.eq(E.var('jsnew'), E.num(2))), [";
const B="            ]),\n          ]),\n          ]),\n          S.If(E.or(E.eq(E.var('jsnew'), E.num(1)), E.eq(E.var('jsnew'), E.num(2))), [";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('extra closer removed'); } else console.log('MISS');
fs.writeFileSync(P,c);