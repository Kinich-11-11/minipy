const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let s = fs.readFileSync(C, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep('  // ---------------- list comprehension ----------------', "  // ---------------- comprehension scope ----------------\n  // Python 3 gives a comprehension its own scope, so the loop variable must not leak.\n  // The compiler saves the old binding in a hidden variable keyed by the comprehension's\n  // node id (unique per site, so nesting is safe) and restores it after the loop.\n  const lcTmp = (nd) => E.join(E.str('__lcv'), nd);\n  const lcSaveTasks = (nd, varNode) => [\n    ...pushT('e', E.str('STOREV'), lcTmp(nd)),\n    ...pushT('e', E.str('PUSHV'), NdA(varNode)),\n  ];\n  const lcRestoreTasks = (nd, varNode) => [\n    ...pushT('e', E.str('DELV'), lcTmp(nd)),\n    ...pushT('e', E.str('STOREV'), NdA(varNode)),\n    ...pushT('e', E.str('PUSHV'), lcTmp(nd)),\n  ];\n  // wrap a comprehension's tasks: restores are queued first (they run last), saves last\n  function lcWrap(tasks, idxs) {\n    const nd = () => E.var('cnd');\n    const head = [], tail = [];\n    for (const k of idxs) {\n      const vn = Ch(nd(), E.num(k));\n      head.push(S.If(E.eq(NdK(vn), E.str('name')), [...lcRestoreTasks(nd(), vn)]));\n      tail.push(S.If(E.eq(NdK(vn), E.str('name')), [...lcSaveTasks(nd(), vn)]));\n    }\n    return [...head, ...tasks, ...tail];\n  }\n" + '  // ---------------- list comprehension ----------------', 'helpers');
rep("            S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')), [...compDict()], [",
    "            S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')), [...lcWrap(compDict(), [2])], [", 'dc wrap');
rep("              S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')), [...compNest()], [",
    "              S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')), [...lcWrap(compNest(), [2, 4])], [", 'lc2 wrap');
rep("                S.If(E.eq(NdN(nd()), E.num(5)), [...compIfStmt()], [...compStmt()]),",
    "                S.If(E.eq(NdN(nd()), E.num(5)), [...lcWrap(compIfStmt(), [2])], [...lcWrap(compStmt(), [2])]),", 'lc wrap');
fs.writeFileSync(C, s);