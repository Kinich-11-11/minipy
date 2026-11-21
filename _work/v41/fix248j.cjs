const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  replaceStmt(bindId, IFELSE(",
  "    OR(CONTAINS('[', item('AName', VAR('aui'))), CONTAINS('.', item('AName', VAR('aui')))),",
  "    [callProc('pathset %s %s %s %s', [item('ATgtLo', VAR('aui')), item('ATgtHi', VAR('aui')), VAR('evtype'), VAR('ev')])],",
  "    [bindId]",
  "  ));"
].join('\n');
const to = [
  "  // 注意：把 bindId 放进 IFELSE 的 else 分支时，chain 会把它当作链尾（next = null），",
  "  // 于是 replaceStmt 复制到的 old.next 已经是 null —— 绑定循环后面的 `aui += 1` 就丢了。",
  "  // 所以在构造之前先把 next 抓下来，替换后再接回去。",
  "  const nextAfterBind = BL()[bindId].next || null;",
  "  const newBind = IFELSE(",
  "    OR(CONTAINS('[', item('AName', VAR('aui'))), CONTAINS('.', item('AName', VAR('aui')))),",
  "    [callProc('pathset %s %s %s %s', [item('ATgtLo', VAR('aui')), item('ATgtHi', VAR('aui')), VAR('evtype'), VAR('ev')])],",
  "    [bindId]",
  "  );",
  "  replaceStmt(bindId, newBind);",
  "  if (nextAfterBind) { BL()[newBind].next = nextAfterBind; BL()[nextAfterBind].parent = newBind; }"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
