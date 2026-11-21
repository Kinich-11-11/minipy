const fs = require('fs');
let s = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (s.includes('$p186')) { console.log('already patched'); process.exit(0); }
s = s.replace("$p185 = 'P393'", "$p186 = 'P396'\n$p185 = 'P393'");
s = s.replace(/('[vV][0-9.]+'\s*=\s*")(\$p\d+)/g, (m, a, b) => a + '$p186,' + b);
const m = s.match(/(\s*)'v4\.184'(\s*)=/);
if (!m) { console.log('MISS v4.184 entry'); process.exit(1); }
s = s.replace(m[0], m[1] + "'v4.185'" + m[2] + '= "$p186"' + '\n' + m[0]);
fs.writeFileSync('_work/v41/rebuild-old.ps1', s);
console.log('patched rebuild-old.ps1 for v4.186');