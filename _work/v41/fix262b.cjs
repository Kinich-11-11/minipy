const fs = require('fs');
const p = '_work/v41/p262.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  console.log('[P262] branch built, inserting before ' + head);\n  insertBeforeStmt(head, branch);\n  console.log('[P262] inserted ok');";
const to = "  spliceAfter(head, chain([branch]));   // 挂在函数体第一条语句之后（insertBeforeStmt 对首句会踩到 predecessorOf 的老问题）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
