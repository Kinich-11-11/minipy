const fs = require('fs');
const p = '_work/v41/p281.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    const wrap = IF(NOT(EQ(VAR('mpisId'), num(0))), [cv]);";
const to = "    const wrap = IF(EQ(VAR('mpisId'), num(0)), [cv]);   // 非 identity 时才调用回调";
if (!s.includes(from)) { console.log('MISS'); return process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
