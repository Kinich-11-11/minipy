const fs = require('fs');
const p = '_work/v41/p270.txt';
let s = fs.readFileSync(p, 'utf8');
const marker = "    console.log('[P270] dsetv guard installed');";
const to = [
  "    // [PZ62] 临时探针：看 dsetv 收到的键类型/值",
  "    insertBeforeStmt(BL()[defIdOf('dsetv %s %s %s %s %s')].next, [",
  "      callProc('fail %s', [JOIN(txt('PZ62 kt=['), JOIN(argOf('kt'), JOIN(txt('] key=['), JOIN(argOf('key'), txt(']')))))])",
  "    ]);",
  marker
].join('\n');
if (!s.includes(marker)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(marker, to));
console.log('ok');
