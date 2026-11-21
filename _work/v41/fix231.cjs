const fs = require('fs');
const p = '_work/v41/p231.txt';
let s = fs.readFileSync(p, 'utf8');
const old = [
  "  const openIf = bracketCmp('(');",
  "  const closeIf = bracketCmp(')');",
  "  const open2If = bracketCmp('[');",
  "  const close2If = bracketCmp(']');",
  "  if (openIf.length !== 1 || closeIf.length !== 1 || open2If.length !== 1 || close2If.length !== 1) {",
  "    throw new Error('[P231] bracket checks = ' + [openIf.length, closeIf.length, open2If.length, close2If.length].join(','));",
  "  }",
  "  BL()[openIf[0]].inputs.CONDITION = B.BOOL(CONTAINS('([{', VAR('eop')));",
  "  BL()[closeIf[0]].inputs.CONDITION = B.BOOL(CONTAINS(')]}', VAR('eop')));",
  "  BL()[open2If[0]].inputs.CONDITION = B.BOOL(NOT(EQ(num(1), num(1))));",
  "  BL()[close2If[0]].inputs.CONDITION = B.BOOL(NOT(EQ(num(1), num(1))));"
].join('\n');
const nw = [
  "  const groups = [['(', '([{'], [')', ')]}'], ['[', null], [']', null]];",
  "  let changed = 0;",
  "  for (const [lit, expr] of groups) {",
  "    for (const id of bracketCmp(lit)) {",
  "      BL()[id].inputs.CONDITION = B.BOOL(expr ? CONTAINS(expr, VAR('eop')) : NOT(EQ(num(1), num(1))));",
  "      changed++;",
  "    }",
  "  }",
  "  if (changed < 4) throw new Error('[P231] bracket checks changed = ' + changed);",
  "  console.log('[P231] fixed ' + changed + ' bracket checks');"
].join('\n');
if (!s.includes(old)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(old, nw));
console.log('ok');
