const fs = require('fs');
const p = '_work/v41/p290.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf("  replaceStmt(bindCall, IFELSE(GT(llen('ErrV'), num(0)), ["), s.indexOf("  console.log('[P290] except as e now binds an instance');"));
const to = [
  '  // 用包一层而不是 replaceStmt（后者会打断语句链）',
  '  {',
  '    const nx = BL()[bindCall].next;',
  '    BL()[bindCall].next = null;',
  '    const wrap = IFELSE(GT(llen("ErrV"), num(0)), [',
  '      callProc("assign %s %s %s", [asnm, item("ErrV", num(1)), item("ErrT", num(1))])',
  '    ], build);',
  '    insertBeforeStmt(bindCall, [wrap]);',
  '    BL()[wrap].next = nx;',
  '    if (nx) BL()[nx].parent = wrap;',
  '  }',
  ''
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
