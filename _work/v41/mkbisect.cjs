const fs = require('fs');
let s = fs.readFileSync('_work/v41/p248.txt', 'utf8');
const from = "  replaceStmt(bindId, newBind);";
const to = "  // [BISECT] step3 disabled\n  if (false) replaceStmt(bindId, newBind);";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("patch('P248 multi-token targets in assignlist'", "patch('P248bisect multi-token targets without step3'");
fs.writeFileSync('_work/v41/p248bisect.txt', s);
console.log('ok');
