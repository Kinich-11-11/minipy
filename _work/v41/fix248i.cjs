const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
// 去掉步骤标记
s = s.split("\n").filter((l) => !l.includes("console.log('[P248] entering ")).join('\n');
// setStack 需要 id 数组
const from = "  setStack(simpleLoop[0], 'SUBSTACK', chain([";
const to = "  setStack(simpleLoop[0], 'SUBSTACK', [";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = [
  "    addToL('ATgtHi', SUB(VAR('mi'), num(1))),",
  "    chgV('mi', num(1))",
  "  ]));"
].join('\n');
const to2 = [
  "    addToL('ATgtHi', SUB(VAR('mi'), num(1))),",
  "    chgV('mi', num(1))",
  "  ]);"
].join('\n');
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
fs.writeFileSync(p, s);
console.log('ok');
