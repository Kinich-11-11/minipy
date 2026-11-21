const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 恢复 stripBody 的真实内容（撤掉 PZ58 的作弊行）
s = s.replace("    setV('ev', txt('3.5'))   // [PZ58] 临时作弊：验证 strval 的结果是否真的被 print 使用",
              "    callProc('substr %s %s %s', [VAR('ev'), num(1), SUB(lenOf(VAR('ev')), num(1))])");
// 2) 把"spliceAfter(每个 ev=vv 站点)"换成"插在 strval 函数体最前面"
const from = s.slice(s.indexOf('  if (!targets.length)'), s.indexOf("  console.log('[P269] trailing-zero trim installed');"));
const to = [
  "  if (!targets.length) throw new Error('[P269] strval sites not found');",
  "  // 关键：数字走的是`什么都不做`的那条路（值本来就在 ev 里），所以必须插在**函数体最前面**。",
  "  // （第 72 轮实测：插在 `ev = vv` 之后对 print(3.50) 完全无效，连 str() 都不变。）",
  "  const head = BL()[defIdOf('strval %s %s')].next;",
  "  insertBeforeStmt(head, [",
  "    IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS('.', VAR('ev'))), [stripBody])",
  "  ]);",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
