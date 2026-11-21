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
// 1. the `with` branch, inserted before the def branch (one extra closer at the chain end)
rep("            S.If(E.eq(v(), E.str('def')), [...defStmt()], [", "            S.If(E.eq(v(), E.str('with')), [\n              tp1(),\n              ...A.nodeK('t1', E.str('with'), E.str(''), 3),\n              ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),\n              ...blkPush(E.var('t1'), 0), ...blkSetKind('with'),\n              ...startExpr(), S.set('stK', E.str('hwith')),\n            ], [            S.If(E.eq(v(), E.str('def')), [...defStmt()], [", 'branch');
rep("      ])," + NL + "      ])," + NL + "    ];" + NL + "  }" + NL + NL + "  function contIf(kw) {",
    "      ])," + NL + "      ])," + NL + "      ])," + NL + "    ];" + NL + "  }" + NL + NL + "  function contIf(kw) {", 'closer');
// 2. the two finalize stages, after the hfor2 stage
rep("      // return value (possibly a tuple)", "      // with [as TARGET]\n      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hwith'))), [\n        S.If(E.and(E.eq(T(), E.str('K')), E.eq(v(), E.str('as'))), [\n          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(1), E.item('Pv', E.var('pvSp'))),\n          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),\n          tp1(),\n          S.If(E.not(E.eq(T(), E.str('I'))), [\n            L.failAt(E.str('SyntaxError: with as needs a name'), E.item('TokL', E.var('tp'))),\n          ]),\n          ...A.nodeN('t3', E.str('name'), V(), []),\n          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(0), E.var('t3')),\n          tp1(), S.set('want', E.num(0)), S.set('stK', E.str('hwith2')), S.set('t6', E.num(1)),\n        ]),\n        S.If(E.eq(E.var('t6'), E.num(0)), [\n          S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [\n            L.failAt(E.str('SyntaxError: with wants : or as'), E.item('TokL', E.var('tp'))),\n          ]),\n          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(1), E.item('Pv', E.var('pvSp'))),\n          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),\n          S.lset('BlS', E.var('blSp'), E.num(2)),\n          tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)),\n        ]),\n      ]),\n      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hwith2'))), [\n        S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [\n          L.failAt(E.str('SyntaxError: with wants :'), E.item('TokL', E.var('tp'))),\n        ]),\n        S.lset('BlS', E.var('blSp'), E.num(2)),\n        tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)),\n      ]),\n      // return value (possibly a tuple)", 'stages');
fs.writeFileSync(P, s);