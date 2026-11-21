const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const sv = reach'), s.indexOf("  const stripBody"));
const to = [
  "  const sv = reach(defIdOf('strval %s %s'));",
  "  // `ev = vv` 在 strval 里出现在多处（字符串分支、末尾 else 等），全部加上规范化；",
  "  // 因为带了 `vt == \"N\"` 的门控，非数字分支不会被影响。",
  "  const targets = [];",
  "  for (const id of sv) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'data_setvariableto' || b.fields.VARIABLE[0] !== 'ev') continue;",
  "    if (nameOf(b.inputs.VALUE) === 'vv') targets.push(id);",
  "  }",
  "  if (!targets.length) throw new Error('[P269] strval ev=vv sites not found');",
  "  console.log('[P269] strval ev=vv sites = ' + targets.length);",
  ""
].join('\n');
if (!from) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = s.slice(s.indexOf('  spliceAfter(target, chain(['), s.indexOf("  console.log('[P269] trailing-zero trim installed');"));
const to2 = [
  "  for (const t of targets) {",
  "    spliceAfter(t, chain([",
  "      IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS('.', VAR('ev'))), [stripBody])",
  "    ]));",
  "  }",
  ""
].join('\n');
if (!from2) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
