const fs = require('fs');
const p = '_work/v41/p237.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  insertBeforeStmt(gate, [",
  "    callProc('hascomma %s %s', [argOf('lo'), SUB(VAR('pxbr'), num(1))])",
  "  ]);",
  "  const cond = BL()[gate].inputs.CONDITION;",
  "  BL()[gate].inputs.CONDITION = B.BOOL(AND(cond[1], EQ(VAR('tqhcm'), num(0))));"
].join('\n');
const to = [
  "  // 自己扫前缀里的顶层逗号（不用 hascomma，避免它把 tqhcm 等共享变量冲掉 —— 上一版正是这样",
  "  // 打坏了 cov3 的 `list max min sum` 与 cov5 的 `builtin sum start`）",
  "  const CONTAINS = (hay, needle) => I('operator_contains', { inputs: { STRING1: B.REP(txt(hay), [10, '']), STRING2: B.REP(needle, [10, '']) } });",
  "  ['cpx', 'cpd', 'cpk'].forEach((n) => newVar(n, 0));",
  "  insertBeforeStmt(gate, [",
  "    setV('cpx', num(0)),",
  "    setV('cpd', num(0)),",
  "    setV('cpk', argOf('lo')),",
  "    REPEATU(GT(VAR('cpk'), SUB(VAR('pxbr'), num(1))), [",
  "      IF(CONTAINS('([{', item('Tok', VAR('cpk'))), [chgV('cpd', num(1))]),",
  "      IF(CONTAINS(')]}', item('Tok', VAR('cpk'))), [chgV('cpd', num(-1))]),",
  "      IF(AND(EQ(VAR('cpd'), num(0)), AND(NOT(EQ(item('Kind', VAR('cpk')), txt('S'))), EQ(item('Tok', VAR('cpk')), txt(',')))), [setV('cpx', num(1))]),",
  "      chgV('cpk', num(1))",
  "    ])",
  "  ]);",
  "  const cond = BL()[gate].inputs.CONDITION;",
  "  BL()[gate].inputs.CONDITION = B.BOOL(AND(cond[1], EQ(VAR('cpx'), num(0))));"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
