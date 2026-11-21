const fs = require('fs');
let s = fs.readFileSync('_work/v41/p291.txt', 'utf8');
s = s.replace("patch('P291 except as e binds an instance'", "patch('P292 except as e binds an instance + class name from text'");
// 加 setAt 助手
s = s.replace("  const varIdOf = (n) =>", "  const setAt = (list, idx, val) => I('data_replaceitemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(idx, [4, '0']), ITEM: B.REP(val, [4, '0']) } });\n  const varIdOf = (n) =>");
// 前置段：把 substr/ascls 提前，ErrV 分支里顺手修正类名
const from = [
  "  insertBeforeStmt(bindCall, [",
  "    IFELSE(GT(llen('ErrV'), num(0)), [",
  "      setV('eid', item('ErrV', num(1))),",
  "      setV('evt2', item('ErrT', num(1)))",
  "    ], [",
  "      callProc('substr %s %s %s', [VAR('tlast'), num(1), ADD(VAR('ascp'), num(-1))]),",
  "      setV('ascls', VAR('ev')),"
].join('\n');
const to = [
  "  insertBeforeStmt(bindCall, [",
  "    // 类名一律取异常文本里 ':' 之前那段（P265 证实 type(x) 返回的就是类型名字符串；",
  "    // 而 raise 记录下来的实例在 InstCls 里读出来是 object，所以这里顺手修正它）",
  "    callProc('substr %s %s %s', [VAR('tlast'), num(1), ADD(VAR('ascp'), num(-1))]),",
  "    setV('ascls', VAR('ev')),",
  "    IFELSE(GT(llen('ErrV'), num(0)), [",
  "      setV('eid', item('ErrV', num(1))),",
  "      setV('evt2', item('ErrT', num(1))),",
  "      setAt('InstCls', VAR('eid'), VAR('ascls'))",
  "    ], ["
].join('\n');
if (!s.includes(from)) { console.log('MISS prelude'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync('_work/v41/p292.txt', s);
console.log('wrote p292.txt');
