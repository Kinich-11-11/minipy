const fs = require('fs');
let s = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (s.includes('$p181')) { console.log('already has p181'); process.exit(0); }
// 1) 在 $p179 行旁声明 $p181
s = s.replace("$p179 = 'P318'", "$p181 = 'P336'\n$p179 = 'P318'");
// 2) 给 map 里所有 'vX.Y' 条目前置 $p181（新版本的最新部件放最前）
s = s.replace(/('[vV][0-9.]+'\s*=\s*")(\$p\d+)/g, (m, a, b) => a + '$p181,' + b);
// 3) 新增 'v4.180' 条目（v4.180 是纯文档版，其后只加了 P336）
s = s.replace(/(\s*)'v4\.179'(\s*)=/, "$1'v4.180'$2= \"$p181\"\n$1'v4.179'$2=");
fs.writeFileSync('_work/v41/rebuild-old.ps1', s);
console.log('patched rebuild-old.ps1');