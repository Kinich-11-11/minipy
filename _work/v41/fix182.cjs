const fs = require('fs');
let s = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (s.includes('$p182')) { console.log('already has p182'); process.exit(0); }
// 1) 声明 $p182
s = s.replace("$p181 = 'P336'", "$p182 = 'P375'\n$p181 = 'P336'");
// 2) 给所有 'vX.Y' 条目前置 $p182
s = s.replace(/('[vV][0-9.]+'\s*=\s*")(\$p\d+)/g, (m, a, b) => a + '$p182,' + b);
// 3) 新增 'v4.181' 条目
const m = s.match(/(\s*)'v4\.180'(\s*)=/);
if (!m) { console.log('MISS v4.180 entry'); process.exit(1); }
s = s.replace(m[0], m[1] + "'v4.181'" + m[2] + '= "$p182"' + '\n' + m[0]);
fs.writeFileSync('_work/v41/rebuild-old.ps1', s);
console.log('patched rebuild-old.ps1 for v4.182');
