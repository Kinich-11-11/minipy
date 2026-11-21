const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = ["      S.If(E.eq(E.var('op'), E.str('%')), [",
  "        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [",
  "          S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),",
  "        ]),",
  "      ]),"].join(NL);
const b = ["      S.If(E.eq(E.var('op'), E.str('%')), [",
  "        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [",
  "          // the left side is a string: Python's % formats, it is not a remainder",
  "          ...strFormat(E.var('va'), E.var('vb'), 'res'),",
  "          S.set('rt', E.str('R')),",
  "        ], [",
  "          S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [",
  "            S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),",
  "          ]),",
  "        ]),",
  "      ]),"].join(NL);
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.slice(0, i) + b + v.slice(i + a.length));
console.log('percent branch patched');