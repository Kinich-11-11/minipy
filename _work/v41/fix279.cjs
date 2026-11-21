const fs = require('fs');
const p = '_work/v41/p279.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf("  replaceStmt(cv, IF(NOT(EQ(VAR('mpisId'), num(0))), [cv])"), s.indexOf("  console.log('[P279] filter(None, xs) installed');"));
const to = [
  "  {",
  "    const nx = BL()[cv].next;",
  "    BL()[cv].next = null;",
  "    const wrap = IF(NOT(EQ(VAR('mpisId'), num(0))), [cv]);",
  "    insertBeforeStmt(cv, [wrap]);",
  "    BL()[wrap].next = nx;",
  "    if (nx) BL()[nx].parent = wrap;",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
