const fs = require('fs');
const p = '_work/v41/p273.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf("  const at = reach(defIdOf('atom %s'));"), s.indexOf("  console.log('[P273] target = '"));
const to = [
  "  // 名字在"值位置"的报错可能出现在 atom 或 eval（实测两者都可能），两个都扫，取第一个命中的。",
  "  const cands = [];",
  "  for (const pc of ['atom %s', 'eval %s %s']) {",
  "    for (const id of reach(defIdOf(pc))) {",
  "      const b = BL()[id];",
  "      if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "      const j = JSON.stringify(b.inputs);",
  "      if (j.indexOf('is not defined') < 0) continue;",
  "      cands.push({ pc, id });",
  "    }",
  "  }",
  "  console.log('[P273] candidates = ' + JSON.stringify(cands.map((c) => c.pc + ':' + c.id)));",
  "  const target = cands[0];",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("  if (!target) throw new Error('[P273] atom NameError site not found');", "  if (!target) throw new Error('[P273] NameError site not found');");
s = s.replace("  console.log('[P273] target = ' + target.id);", "  console.log('[P273] target = ' + target.pc + ' ' + target.id);");
fs.writeFileSync(p, s);
console.log('ok');
