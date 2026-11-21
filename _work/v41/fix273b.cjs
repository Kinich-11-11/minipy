const fs = require('fs');
const p = '_work/v41/p273.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf("  const at = reach(defIdOf('atom %s'));"), s.indexOf("  console.log('[P273] target = '"));
const to = [
  "  // A bare name in value position may fail in atom or in eval, so scan both and take the first hit.",
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
