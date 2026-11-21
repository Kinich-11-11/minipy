// 临时调试：在 assignlist 扁平守卫之后打印 augrp / augnames
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const auSets = find(al,";
const ins = [
  "  insertBeforeStmt(flatNx, [callProc('fail %s', [JOIN(VAR('augrp'), JOIN(txt('/'), VAR('augnames')))])]);",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
