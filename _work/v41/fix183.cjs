const fs = require('fs');
let s = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (s.includes('$p183')) { console.log('already patched'); process.exit(0); }
s = s.replace("$p182 = 'P375'", "$p183 = 'P383'\n$p182 = 'P375'");
s = s.replace(/('[vV][0-9.]+'\s*=\s*")(\$p\d+)/g, (m, a, b) => a + '$p183,' + b);
const m = s.match(/(\s*)'v4\.181'(\s*)=/);
if (!m) { console.log('MISS v4.181 entry'); process.exit(1); }
s = s.replace(m[0], m[1] + "'v4.182'" + m[2] + '= "$p183"' + '\n' + m[0]);
fs.writeFileSync('_work/v41/rebuild-old.ps1', s);
console.log('patched rebuild-old.ps1 for v4.183');