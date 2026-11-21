const fs = require('fs');
let s = fs.readFileSync('_work/v41/p366.txt', 'utf8');
const from = "  insertBeforeStmt(site, [wrap]);\n  BB[wrap].next = nx;";
const to = "  insertBeforeStmt(site, [wrap]);\n  BB[site].parent = wrap;      // 站点被放进 else 分支，必须改它的 parent\n  BB[wrap].next = nx;";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p366.txt', s.replace(from, to));
console.log('ok');