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
rep("  function binBlock() {", "  // '%d-%s' % (3, 'x'): Python's modulo operator formats a string.  Supports %s (str),\n  // %d (truncated int), %f/%r (plain repr) and %%; the right side may be a tuple or a scalar.\n  function strFormat(fmtv, argv, dst) {\n    return [\n      ...L.payInto(fmtv, 'sf'),\n      S.set('sfo', E.str('')), S.set('sfi', E.num(1)), S.set('sfai', E.num(1)), S.set('sftup', E.num(0)),\n      S.If(E.eq(E.letter(E.num(1), argv), E.str('T')), [\n        S.set('sftup', E.num(1)),\n        ...L.payInto(argv, 'sft'),\n      ]),\n      S.Until(E.gt(E.var('sfi'), E.slen(E.var('sf'))), [\n        S.If(E.and(E.eq(E.letter(E.var('sfi'), E.var('sf')), E.str('%')), E.le(E.add(E.var('sfi'), E.num(1)), E.slen(E.var('sf')))), [\n          S.set('sfc', E.letter(E.add(E.var('sfi'), E.num(1)), E.var('sf'))),\n          S.If(E.eq(E.var('sfc'), E.str('%')), [\n            S.set('sfo', E.join(E.var('sfo'), E.str('%'))),\n          ], [\n            S.set('sfx', E.str('')),\n            S.If(E.eq(E.var('sftup'), E.num(1)), [\n              S.set('sfv', heapGet(E.var('sft'), E.var('sfai'))),\n              S.chg('sfai', E.num(1)),\n            ], [S.set('sfv', argv)]),\n            S.If(E.eq(E.var('sfc'), E.str('d')), [\n              ...L.payInto(E.var('sfv'), 'sfn'),\n              S.set('sfni', E.math('floor', E.var('sfn'))),\n              S.If(E.lt(E.var('sfn'), E.num(0)), [S.set('sfni', E.math('ceiling', E.var('sfn')))]),\n              S.set('sfx', E.join(E.str(''), E.var('sfni'))),\n            ], [\n              ...tostr(E.var('sfv'), 'sfx'),\n            ]),\n            S.set('sfo', E.join(E.var('sfo'), E.var('sfx'))),\n          ]),\n          S.chg('sfi', E.num(1)),\n        ], [\n          S.set('sfo', E.join(E.var('sfo'), E.letter(E.var('sfi'), E.var('sf')))),\n        ]),\n        S.chg('sfi', E.num(1)),\n      ]),\n      S.set(dst, E.join(E.str('S'), E.var('sfo'))),\n    ];\n  }\n  function binBlock() {", 'strFormat');
const a = ["      S.If(E.eq(E.var('op'), E.str('%')), [",
  "        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [",
  "          S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),",
  "        ]),",
  "      ]),",
  ""].join(NL);
rep(a, "      S.If(E.eq(E.var('op'), E.str('%')), [\n        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [\n          // left side is a string: Python's % is string formatting, not a remainder\n          ...strFormat(E.var('va'), E.var('vb'), 'res'),\n          S.set('rt', E.str('R')),\n        ], [\n          S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [\n            S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),\n          ]),\n        ]),\n      ]),\n", 'percent branch');
fs.writeFileSync(V, v);