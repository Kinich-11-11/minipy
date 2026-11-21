const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const head = BL()[defIdOf('strval %s %s')].next;";
const ins = [
  "  const stripBody = REPEATU(OR(NOT(GT(lenOf(VAR('ev')), num(1))),",
  "    OR(NOT(EQ(letterOf(lenOf(VAR('ev')), VAR('ev')), txt('0'))),",
  "      EQ(letterOf(SUB(lenOf(VAR('ev')), num(1)), VAR('ev')), txt('.')))), [",
  "    callProc('substr %s %s %s', [VAR('ev'), num(1), SUB(lenOf(VAR('ev')), num(1))])",
  "  ]);",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins));
console.log('ok');
