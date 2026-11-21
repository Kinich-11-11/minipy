const fs = require('fs');
const p = '_work/v41/p291.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  let vvKey = null, vtKey = null;'), s.indexOf("  console.log('[P291] assign now binds the instance"));
const to = [
  "  let vvKey = null, vtKey = null;",
  "  for (const k of keys) {",
  "    const v = b.inputs[k];",
  "    const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : null;",
  "    const q = id ? BL()[id] : null;",
  "    if (q && q.opcode === 'data_variable') {",
  "      if (q.fields.VARIABLE[0] === 'asmsg') vvKey = k;",
  "      if (q.fields.VARIABLE[0] === 'asnm') vtKey = k;",
  "    } else if (litOf(v) === 'asmsg') { vvKey = k; } else if (litOf(v) === 'S') { vtKey = k; }",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
