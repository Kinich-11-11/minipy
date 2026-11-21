const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("  // ------------------------------------------------ keyword statements", "  // ------------------------------------------------ yield\n  // `yield` marks the innermost enclosing def as a generator (NdG = 'g') and produces a\n  // yield node; the compiler turns that into the YIELD instruction and a GDEF.\n  function yieldStmt() {\n    return [\n      tp1(),\n      S.set('gkj', E.var('blSp')), S.set('gkn', E.num(0)),\n      S.Until(E.or(E.lt(E.var('gkj'), E.num(1)), E.eq(E.var('gkn'), E.num(1))), [\n        S.If(E.eq(E.item('BlK', E.var('gkj')), E.str('def')), [\n          S.lset('NdG', E.item('BlN', E.var('gkj')), E.str('g')), S.set('gkn', E.num(1)),\n        ]),\n        S.chg('gkj', E.num(-1)),\n      ]),\n      S.If(E.eq(E.var('gkn'), E.num(0)), [\n        L.failAt(E.str('SyntaxError: yield outside function'), E.item('TokL', E.var('tp'))),\n      ]),\n      S.If(E.or(E.eq(T(), E.str('W')), E.or(E.eq(T(), E.str(';')), E.eq(T(), E.str('E')))), [\n        ...A.nodeN('t3', E.str('yield'), E.str(''), []), ...finishStmt(E.var('t3')),\n      ], [\n        ...startExpr(), S.set('stK', E.str('hyld')),\n      ]),\n    ];\n  }\n  // ------------------------------------------------ keyword statements", 'yieldStmt');
rep("                                      S.If(E.eq(v(), E.str('import')), [...importStmt()], [",
    "                                      S.If(E.eq(v(), E.str('yield')), [...yieldStmt()], [" + NL + "                                      S.If(E.eq(v(), E.str('import')), [...importStmt()], [", 'yield branch');
rep("      // return value (possibly a tuple)", "      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hyld'))), [\n        ...A.nodeN('t3', E.str('yield'), E.str(''), [E.item('Pv', E.var('pvSp'))]),\n        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),\n        ...finishStmt(E.var('t3')),\n        S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),\n        S.set('t6', E.num(1)),\n      ]),\n      // return value (possibly a tuple)", 'hyld final');
fs.writeFileSync(P, s);