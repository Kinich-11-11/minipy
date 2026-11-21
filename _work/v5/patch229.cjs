const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
v = v.replace("'any', 'all', 'enumerate', 'zip', '__sortpairs'];", "'any', 'all', 'enumerate', 'zip', '__sortpairs', 'divmod'];");
const anchor = "      S.If(E.eq(bn(), E.str(sortKeyName())), [";
const i = v.indexOf(anchor);
if (i < 0) { console.log('MISS'); process.exit(1); }
v = v.slice(0, i) + "      S.If(E.eq(bn(), E.str(key('divmod'))), [\n        // divmod(a, b) -> (a // b, a % b), with Python's floor semantics\n        ...L.payInto(arg(2), 'dma'),\n        ...L.payInto(arg(3), 'dmb'),\n        S.If(E.eq(E.var('dmb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [\n          S.set('dmq', E.math('floor', E.div(E.var('dma'), E.var('dmb')))),\n          ...heapNew('dmt'),\n          ...heapPush(E.var('dmt'), E.var('dmq')),\n          ...heapPush(E.var('dmt'), E.sub(E.var('dma'), E.mul(E.var('dmb'), E.var('dmq')))),\n          ...drop(),\n          ...vpush(E.join(E.str('T'), E.var('dmt'))),\n        ]),\n      ]),\n" + v.slice(i);
fs.writeFileSync(V, v);
console.log('divmod added');