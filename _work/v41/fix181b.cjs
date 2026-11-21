const fs = require('fs');
let s = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (s.includes("'v4.180'")) { console.log('already present'); process.exit(0); }
const m = s.match(/(\s*)'v4\.178'(\s*)=/);
if (!m) { console.log('MISS v4.178 entry'); process.exit(1); }
const ind = m[1], sp = m[2];
s = s.replace(m[0], ind + "'v4.180'" + sp + '= "$p181"' + "\n" + ind + "'v4.179'" + sp + '= "$p181"' + "\n" + m[0]);
fs.writeFileSync('_work/v41/rebuild-old.ps1', s);
console.log('added v4.180 / v4.179 entries');