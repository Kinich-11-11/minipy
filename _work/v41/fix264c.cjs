const fs = require('fs');
const p = '_work/v41/p264.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  let failId = null;'), s.indexOf("  if (!failId) throw new Error"));
const to = [
  "  const PREFIX = \"AttributeError: 'str' object has no attribute\";",
  "  const hasPrefix = (b) => {",
  "    const v = b.inputs && b.inputs.STRING1;",
  "    const l = litOf(v);",
  "    if (l && l.indexOf(PREFIX) === 0) return true;",
  "    return Object.values(b.inputs || {}).some((x) => { const t = litOf(x); return !!t && t.indexOf(PREFIX) === 0; });",
  "  };",
  "  let failId = null;",
  "  for (const id of ev) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "    const v = b.inputs[Object.keys(b.inputs)[0]];",
  "    if (!deepHas(v && v[1], hasPrefix, 0)) continue;",
  "    failId = id;",
  "    break;",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
