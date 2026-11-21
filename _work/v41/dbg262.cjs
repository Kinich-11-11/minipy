const fs = require('fs');
const p = '_work/v41/p262.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  insertBeforeStmt(head, branch);";
const to = [
  "  console.log('[P262] branch built, inserting before ' + head);",
  "  insertBeforeStmt(head, branch);",
  "  console.log('[P262] inserted ok');"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
