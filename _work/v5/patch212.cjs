const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
function rep(a, b, tag) {
  const i = v.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  v = v.slice(0, i) + b + v.slice(i + a.length);
  console.log('ok ' + tag);
}
// 1. restore the plain numeric modulo branch
rep(["      ...L.outLine(E.join(E.str('BEFORE% op=['), E.join(E.var('op'), E.str(']')))),",
  "      S.If(E.eq(op(), E.str('%')), [",
  "        ...L.outLine(E.str('PCTBRANCH ran')),",
  "        ...L.outLine(E.join(E.str('PCTBRANCH tag=['), E.join(E.letter(E.num(1), E.var('va')), E.str(']')))),",
  "        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [",
  "          // the left side is a string: Python's % formats, it is not a remainder",
  "          ...strFormat(E.var('va'), E.var('vb'), 'res'),",
  "          S.set('rt', E.str('R')),",
  "        ], [",
  "          S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [",
  "            S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),",
  "          ]),",
  "        ]),",
  "      ]),"].join(NL),
  ["      S.If(E.eq(op(), E.str('%')), [",
  "        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [",
  "          S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),",
  "        ]),",
  "      ]),"].join(NL), 'modulo branch');
// 2. drop the entry probe and the strFormat helper
rep(["      S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0))," + NL,
  "        ...L.outLine(E.join(E.str('BINDBG op=['), E.join(E.var('op'), E.str(']'))))," + NL,
  "        ...L.outLine(E.join(E.str('BINDBG tag=['), E.join(E.letter(E.num(1), E.var('va')), E.str(']'))))," + NL,
  "        ...L.outLine(E.join(E.str('BINDBG va=['), E.join(E.var('va'), E.str(']'))))," + NL].join(''),
  "      S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0))," + NL, 'entry probe');
const s0 = v.indexOf('  // %d-%s');
const s1 = v.indexOf('  function binBlock() {');
if (s0 < 0 || s1 < 0 || s1 < s0) { console.log('MISS strFormat region ' + s0 + ' ' + s1); process.exit(1); }
v = v.slice(0, s0) + v.slice(s1);
console.log('strFormat removed');
fs.writeFileSync(V, v);