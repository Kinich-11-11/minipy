const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf("  insertBeforeStmt(head, ["), s.indexOf("  console.log('[P269] float trailing-zero trim installed at strval entry');"));
const to = [
  "  insertBeforeStmt(head, [",
  "    setV('ev', txt('QQ')),   // [PZ60] 无条件标记：看 print 是否使用 strval 的结果",
  "    setV('evtype', txt('S'))",
  "  ]);",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
