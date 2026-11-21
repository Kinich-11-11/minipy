const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    callProc('substr %s %s %s', [VAR('ev'), num(1), SUB(lenOf(VAR('ev')), num(1))])";
const to = "    setV('ev', txt('3.5'))   // [PZ58] 临时作弊：验证 strval 的结果是否真的被 print 使用";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
