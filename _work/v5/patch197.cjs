const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = "        S.If(E.eq(E.var('revs'), E.num(1)), [...listReverse(E.var('tobj'))]),";
if (v.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.replace(a, "        S.If(E.eq(E.var('revs'), E.num(1)), [\n          S.set('si', E.num(1)), S.set('sj', E.item('LCount', E.var('tobj'))),\n          S.Until(E.ge(E.var('si'), E.var('sj')), [\n            S.set('sv1', heapGet(E.var('tobj'), E.var('si'))),\n            S.set('sv2', heapGet(E.var('tobj'), E.var('sj'))),\n            S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('si'), E.num(1))), E.var('sv2')),\n            S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('sj'), E.num(1))), E.var('sv1')),\n            S.chg('si', E.num(1)), S.chg('sj', E.num(-1)),\n          ]),\n        ]),"));
console.log('swap loop inlined');