const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let lines = fs.readFileSync(V, 'utf8').split(NL);
const before = lines.length;
lines = lines.filter((l) => !/REACHED P[0-9]/.test(l) && l.indexOf("// '%d-%s' % (3, 'x'): Python's modulo") < 0);
let v = lines.join(NL);
console.log('probe/comment lines removed: ' + (before - lines.length));
// add strFormat + the binBlock branch
const a1 = '  function binBlock() {';
const i1 = v.indexOf(a1);
if (i1 < 0) { console.log('MISS binBlock'); process.exit(1); }
v = v.slice(0, i1) + '  // '%d-%s' % (3, 'x'): Python's modulo on a string formats it.  Supports %s (str), %d\n  // (truncated int), %f/%r (plain repr) and %%; the right side may be a tuple or a scalar.\n  // This lives in binBlock, not arithBlock: arithBlock only runs when BOTH operands are\n  // numeric, which is exactly why a string left side never got there before.\n  function strFormat(fmtv, argv, dst) {\n    return [\n      ...L.payInto(fmtv, 'sf'),\n      S.set('sfo', E.str('')), S.set('sfi', E.num(1)), S.set('sfai', E.num(1)), S.set('sftup', E.num(0)),\n      S.If(E.eq(E.letter(E.num(1), argv), E.str('T')), [\n        S.set('sftup', E.num(1)),\n        ...L.payInto(argv, 'sft'),\n      ]),\n      S.Until(E.gt(E.var('sfi'), E.slen(E.var('sf'))), [\n        S.If(E.and(E.eq(E.letter(E.var('sfi'), E.var('sf')), E.str('%')), E.le(E.add(E.var('sfi'), E.num(1)), E.slen(E.var('sf')))), [\n          S.set('sfc', E.letter(E.add(E.var('sfi'), E.num(1)), E.var('sf'))),\n          S.If(E.eq(E.var('sfc'), E.str('%')), [\n            S.set('sfo', E.join(E.var('sfo'), E.str('%'))),\n          ], [\n            S.set('sfx', E.str('')),\n            S.If(E.eq(E.var('sftup'), E.num(1)), [\n              S.set('sfv', heapGet(E.var('sft'), E.var('sfai'))),\n              S.chg('sfai', E.num(1)),\n            ], [S.set('sfv', argv)]),\n            S.If(E.eq(E.var('sfc'), E.str('d')), [\n              ...L.payInto(E.var('sfv'), 'sfn'),\n              S.set('sfni', E.math('floor', E.var('sfn'))),\n              S.If(E.lt(E.var('sfn'), E.num(0)), [S.set('sfni', E.math('ceiling', E.var('sfn')))]),\n              S.set('sfx', E.join(E.str(''), E.var('sfni'))),\n            ], [\n              ...tostr(E.var('sfv'), 'sfx'),\n            ]),\n            S.set('sfo', E.join(E.var('sfo'), E.var('sfx'))),\n          ]),\n          S.chg('sfi', E.num(1)),\n        ], [\n          S.set('sfo', E.join(E.var('sfo'), E.letter(E.var('sfi'), E.var('sf')))),\n        ]),\n        S.chg('sfi', E.num(1)),\n      ]),\n      S.set(dst, E.join(E.str('S'), E.var('sfo'))),\n    ];\n  }\n' + v.slice(i1);
const anchor = ["      S.If(E.eq(E.var('op'), E.str('*')), [repeatBlock()]),"].join(NL);
const branch = [
      S.If(E.eq(E.var('op'), E.str('%')), [
        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [
          ...strFormat(E.var('va'), E.var('vb'), 'res'),
          S.set('rt', E.str('R')),
        ]),
      ]),
      " + anchor].join(NL);
const i2 = v.indexOf(anchor);
if (i2 < 0) { console.log('MISS repeat anchor'); process.exit(1); }
v = v.slice(0, i2) + branch + v.slice(i2 + anchor.length);
fs.writeFileSync(V, v);
console.log('strFormat + binBlock branch installed');