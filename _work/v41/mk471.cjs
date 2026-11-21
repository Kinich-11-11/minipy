const fs = require('fs');
let s = fs.readFileSync('_work/v41/p469.txt', 'utf8');
s = s.replace("    insertBeforeStmt(id, [LOGX(msg)]);", "    try { insertBeforeStmt(id, [LOGX(msg)]); } catch (e) { skipped++; }");
s = s.replace("  console.log('[P469] fail sites=' + targets.length);", "  console.log('[P469] fail sites=' + targets.length);\n  let skipped = 0;");
s = s.replace("  console.log('[P469] probes installed');", "  console.log('[P469] probes installed, skipped=' + skipped);");
s = s.split('P469').join('P471');
fs.writeFileSync('_work/v41/p471.txt', s);
console.log('p471 written from p469.txt');