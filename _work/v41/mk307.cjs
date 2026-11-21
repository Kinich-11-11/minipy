const fs = require('fs');
let s = fs.readFileSync('_work/v41/p306.txt', 'utf8');
s = s.replace("patch('P306 tuplelit skips lambda parameter commas'", "patch('P307 tuplelit skips lambda params + grouping when no comma'");
// 新增 tqnc（真正的顶层逗号个数）
s = s.replace("  if (taken.has('tqlf')) throw new Error('[P306] tqlf taken');\n  newVar('tqlf', 0);",
  "  if (taken.has('tqlf')) throw new Error('[P307] tqlf taken');\n  if (taken.has('tqnc')) throw new Error('[P307] tqnc taken');\n  newVar('tqlf', 0);\n  newVar('tqnc', 0);");
// 初始化 tqnc = 0（并到 tqlf 那条链上）
s = s.replace("  spliceAfter(initSite, chain([setV('tqlf', num(0))]));",
  "  spliceAfter(BL()[defIdOf('tuplelit %s %s')].next, chain([setV('tqlf', num(0)), setV('tqnc', num(0))]));\n  // 真正收集到一个顶层逗号时计数 +1（插在分隔符判定体最前面）\n  insertBeforeStmt(BL()[commaIf].inputs.SUBSTACK[1], [chgV('tqnc', num(1))]);");
// 结尾：没有真正逗号 → 括号就是分组，重新求值内层区间（此时 ev/evtype 即为那个唯一元素）
s = s.replace("  console.log('[P306] tuplelit now skips lambda parameter commas');",
  "  // 元素循环结束后：若一个真正的顶层逗号都没有，说明括号只是分组 →\n"
  + "  // 用原来的内层区间再 eval 一次，让 ev/evtype 直接等于那个唯一元素（而不是 1 元组）。\n"
  + "  { const bh = BL()[defIdOf('tuplelit %s %s')].next; let last = bh;"
  + "    for (let i = 0; i < 200 && BL()[last].next; i++) last = BL()[last].next;"
  + "    spliceAfter(last, chain([IF(AND(EQ(VAR('tqnc'), num(0)), GT(argOf('hi'), argOf('lo'))), [callProc('eval %s %s', [argOf('lo'), argOf('hi')])])])); }"
  + "\n"
  + "  console.log('[P307] parenthesised single expression returns the value itself');");
fs.writeFileSync('_work/v41/p307.txt', s);
console.log('wrote p307.txt');
