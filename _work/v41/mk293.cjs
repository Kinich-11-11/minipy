const fs = require('fs');
let s = fs.readFileSync('_work/v41/p291.txt', 'utf8');
s = s.replace("patch('P291 except as e binds an instance'", "patch('P293 except as e binds an instance (class name from tnm)'");
// 1) 多一个列表 ErrN（raise 分支的 tnm 就是类名）
s = s.replace("for (const l of ['ErrV', 'ErrT']) {", "for (const l of ['ErrV', 'ErrT', 'ErrN']) {");
// 2) raise 分支同时记录类名 tnm
const fromRaise = "    insertBeforeStmt(h, [\n      IF(EQ(VAR('evtype'), txt('O')), [clearL('ErrV'), clearL('ErrT'), addTo('ErrV', VAR('ev')), addTo('ErrT', VAR('evtype'))])\n    ]);";
const toRaise = "    insertBeforeStmt(h, [\n      IF(NOT(EQ(VAR('tnm'), txt(''))), [clearL('ErrN'), addTo('ErrN', VAR('tnm'))]),\n      IF(EQ(VAR('evtype'), txt('O')), [clearL('ErrV'), clearL('ErrT'), addTo('ErrV', VAR('ev')), addTo('ErrT', VAR('evtype'))])\n    ]);";
if (!s.includes(fromRaise)) { console.log('MISS raise'); process.exit(1); }
s = s.replace(fromRaise, toRaise);
// 3) 前置段：内部错误时优先用 ErrN 当类名；**不要**再 setAt('InstCls')（会破坏 e5）
const fromPre = [
  "  insertBeforeStmt(bindCall, [",
  "    IFELSE(GT(llen('ErrV'), num(0)), [",
  "      setV('eid', item('ErrV', num(1))),",
  "      setV('evt2', item('ErrT', num(1)))",
  "    ], [",
  "      callProc('substr %s %s %s', [VAR('tlast'), num(1), ADD(VAR('ascp'), num(-1))]),",
  "      setV('ascls', VAR('ev')),"
].join('\n');
const toPre = [
  "  insertBeforeStmt(bindCall, [",
  "    IFELSE(GT(llen('ErrV'), num(0)), [",
  "      setV('eid', item('ErrV', num(1))),",
  "      setV('evt2', item('ErrT', num(1)))",
  "    ], [",
  "      // 类名：raise 分支记下的 tnm 优先；否则退回异常文本 ':' 之前那段",
  "      IFELSE(GT(llen('ErrN'), num(0)), [",
  "        setV('ascls', item('ErrN', num(1)))",
  "      ], [",
  "        callProc('substr %s %s %s', [VAR('tlast'), num(1), ADD(VAR('ascp'), num(-1))]),",
  "        setV('ascls', VAR('ev'))",
  "      ]),"
].join('\n');
if (!s.includes(fromPre)) { console.log('MISS pre'); process.exit(1); }
s = s.replace(fromPre, toPre);
fs.writeFileSync('_work/v41/p293.txt', s);
console.log('wrote p293.txt');
