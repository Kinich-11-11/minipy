// p359 = p357 + 在 eval 入口块（扫描 + p344end）前后保存/恢复 ev/evtype
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p357.txt', 'utf8');
// 声明
s = s.replace(
  "  const BB = T(IT).blocks;",
  "  for (const n of ['p359ev', 'p359evt']) if (taken.has(n)) throw new Error('[P359] var taken: ' + n);\n  newVar('p359ev', ''); newVar('p359evt', '');\n  const BB = T(IT).blocks;"
);
// 在 eval 入口最前面保存
const head = "  insertBeforeStmt(evalHead, [\n    setV('p344close', argOf('hi')),";
if (!s.includes(head)) { console.log('MISS head'); process.exit(1); }
s = s.replace(head, "  insertBeforeStmt(evalHead, [\n    setV('p359ev', VAR('ev')),\n    setV('p359evt', VAR('evtype')),\n    setV('p344close', argOf('hi')),");
// 在链式后半段之前恢复（链式分支自己会产生新的 ev）
const marker = "    // 链式后半段：三层嵌套 IF（**不要**用嵌套 AND）";
if (!s.includes(marker)) { console.log('MISS marker'); process.exit(1); }
s = s.replace(marker, "    setV('ev', VAR('p359ev')),\n    setV('evtype', VAR('p359evt')),\n" + marker);
s = s.split('P357').join('P359');
fs.writeFileSync('_work/v41/p359.txt', s);
console.log('wrote p359.txt (save/restore ev around the entry block)');
