const fs = require('fs');
const p = '_work/v41/p290.txt';
let s = fs.readFileSync(p, 'utf8');
// 把追加段里的两次 assign 改成"直接写变量表"（P104/P285 的 write-back 写法）——
// assign 在这条路径上似乎不生效，而 Names/Values/Types 是权威的表。
const helper = [
  "  const setAt = (list, idx, val) => I('data_replaceitemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(idx, [4, '0']), ITEM: B.REP(val, [4, '0']) } });",
  "  const bindE = (vvExpr, vtExpr) => [",
  "    callProc('lookup %s', [argOf('asnm')]),",
  "    IFELSE(GT(VAR('found'), num(0)), [",
  "      setAt('Values', VAR('found'), vvExpr),",
  "      setAt('Types', VAR('found'), vtExpr)",
  "    ], [",
  "      addTo('Names', argOf('asnm')),",
  "      addTo('Values', vvExpr),",
  "      addTo('Types', vtExpr),",
  "      IF(GT(llen('Show'), num(0)), [addTo('Show', txt(''))])",
  "    ])",
  "  ];",
  ""
].join('\n');
if (!s.includes('const setAt =')) {
  s = s.replace("  // (a) fail %s：清掉 ErrV/ErrT", helper + "  // (a) fail %s：清掉 ErrV/ErrT");
}
// 替换两处 assign
const a1 = "      callProc('assign %s %s %s', [asnm, item('ErrV', num(1)), item('ErrT', num(1))])";
const a2 = "      callProc('assign %s %s %s', [asnm, VAR('eid'), txt('O')])";
if (!s.includes(a1) || !s.includes(a2)) { console.log('MISS assign'); process.exit(1); }
s = s.replace(a1, "      ...bindE(item('ErrV', num(1)), item('ErrT', num(1)))");
s = s.replace(a2, "      ...bindE(VAR('eid'), txt('O'))");
fs.writeFileSync(p, s);
console.log('ok');
