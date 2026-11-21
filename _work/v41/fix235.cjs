const fs = require('fs');
const p = '_work/v41/p235.txt';
let s = fs.readFileSync(p, 'utf8');
const from1 = "  const mark = one(targets, 'wrapper strip sites');";
const to1 = "  if (!targets.length) throw new Error('[P235] no wrapper strip sites');\n  const all = targets;";
if (!s.includes(from1)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from1, to1);
const from2 = "  insertBeforeStmt(mark, [";
const to2 = "  for (const mark of all) insertBeforeStmt(mark, [";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
const from3 = [
  "  const cond = BL()[mark].inputs.CONDITION;",
  "  BL()[mark].inputs.CONDITION = B.BOOL(AND(cond[1], EQ(VAR('pwrap'), num(1))));"
].join('\n');
const to3 = [
  "  for (const mark of all) {",
  "    const cond = BL()[mark].inputs.CONDITION;",
  "    BL()[mark].inputs.CONDITION = B.BOOL(AND(cond[1], EQ(VAR('pwrap'), num(1))));",
  "  }"
].join('\n');
if (!s.includes(from3)) { console.log('MISS3'); process.exit(1); }
s = s.replace(from3, to3);
s = s.replace("console.log('[P235] wrapping-paren strip now verifies the pair');",
  "console.log('[P235] wrapping-paren strip now verifies the pair, sites=' + all.length);");
fs.writeFileSync(p, s);
console.log('ok');
