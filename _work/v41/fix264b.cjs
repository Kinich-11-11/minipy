const fs = require('fs');
const p = '_work/v41/p264.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  let failId = null;'), s.indexOf("  if (!failId) throw new Error"));
const to = [
  "  let failId = null;",
  "  for (const id of ev) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "    if (!JSON.stringify(b.inputs).includes(\"AttributeError: 'str' object has no attribute\")) continue;",
  "    failId = id;",
  "    break;",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
