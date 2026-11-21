const fs = require('fs');
const p = '_work/v41/p256.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "    const oldExpr = c.id;",
  "    const kindChk = NOT(EQ(item('Kind', c.idx), txt('S')));",
  "    const wrapped = B.BOOL(AND(oldExpr, kindChk));",
  "    BL()[wrapped].parent = ref.pid;",
  "    BL()[oldExpr].parent = wrapped;",
  "    BL()[ref.pid].inputs[ref.slot] = B.BOOL(wrapped);",
  "    n++;"
].join('\n');
const to = [
  "    const oldExpr = c.id;",
  "    const kindChk = NOT(EQ(item('Kind', c.idx), txt('S')));   // NOT/EQ 返回积木 id",
  "    const andId = AND(oldExpr, kindChk);",
  "    BL()[andId].parent = ref.pid;",
  "    BL()[kindChk].parent = andId;",
  "    BL()[oldExpr].parent = andId;",
  "    BL()[ref.pid].inputs[ref.slot] = B.BOOL(andId);",
  "    n++;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
