const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
const o="      is('STOREV', [\r\n        ...vpop('vb'),\r\n        S.If(E.eq(E.var('frTop'), E.num(1)), [\r\n          ...bindSet(E.var('GlobMap'), ia(), E.var('vb'), 'fd'),\r\n        ], [\r\n          ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd'),\r\n        ]),\r\n      ]),", n="      is('STOREV', [\r\n        ...vpop('vb'),\r\n        S.set('isg', E.num(0)),\r\n        S.If(E.gt(E.item('FrGlob', E.var('frTop')), E.num(0)), [\r\n          S.set('i', E.num(1)),\r\n          S.Until(E.gt(E.var('i'), E.item('LCount', E.item('FrGlob', E.var('frTop')))), [\r\n            S.If(E.eq(heapGet(E.item('FrGlob', E.var('frTop')), E.var('i')), ia()), [S.set('isg', E.num(1))]),\r\n            S.chg('i', E.num(1)),\r\n          ]),\r\n        ]),\r\n        S.If(E.or(E.eq(E.var('frTop'), E.num(1)), E.eq(E.var('isg'), E.num(1))), [\r\n          ...bindSet(E.var('GlobMap'), ia(), E.var('vb'), 'fd'),\r\n        ], [\r\n          ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd'),\r\n        ]),\r\n      ]),";
if(c.includes(o)){ fs.writeFileSync(P+'vm.js', c.split(o).join(n)); console.log('storev patched'); } else console.log('MISS');
// add FrGlob to the declared lists
const I='D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
let k=fs.readFileSync(I,'utf8');
const io="  'FrAux', 'HdFr', 'HdSt', 'HdPc',";
const inw="  'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc',";
if(k.includes(io)){ fs.writeFileSync(I, k.split(io).join(inw)); console.log('FrGlob declared'); } else console.log('FrGlob MISS');
