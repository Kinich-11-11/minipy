const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const from = s.slice(s.indexOf("    // 无条件诊断"), s.indexOf("    // ---------- (2) 链式后半段 ----------"));
if (!from) { console.log('MISS diag'); process.exit(1); }
s = s.replace(from, '');
if (s.indexOf('D ok=') >= 0) { console.log('MISS leftover'); process.exit(1); }
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('diagnostics removed');