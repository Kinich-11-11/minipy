const fs = require('fs');
const p = '_work/v41/pz44.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 每次 eval 进入时清空 dbg（插在函数体最前面）
const anchor = "  const loop = loops[0];";
const reset = [
  "  insertBeforeStmt(BL()[defIdOf('eval %s %s')].next, [setV('dbg', txt(''))]);",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS1'); process.exit(1); }
s = s.replace(anchor, reset);
fs.writeFileSync(p, s);
console.log('ok');
