const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz96.txt', 'utf8');
const from = [
  '    const tag = "EV" + k;',
  '    insertBeforeStmt(id, ['
].join('\n').replace(/"/g, "'");
const to = [
  "    const tag = 'EV' + k;",
  "    try {",
  "    insertBeforeStmt(id, ["
].join('\n');
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = [
  "      callProc('log %s', [JOIN(txt(tag + ' hi='), argOf('hi'))])",
  "    ]);"
].join('\n');
const to2 = [
  "      callProc('log %s', [JOIN(txt(tag + ' hi='), argOf('hi'))])",
  "    ]);",
  "    } catch (e) { console.log('[PZ96] skip ' + id + ' : ' + e.message); }"
].join('\n');
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
fs.writeFileSync('_work/v41/pz96.txt', s);
console.log('ok');