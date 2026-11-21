const fs = require('fs');
const p = '_work/v41/p273.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  // A bare name in value position'), s.indexOf("  console.log('[P273] candidates = '"));
const to = [
  "  // A bare name in value position may fail in atom or in eval, so scan both and take the first hit.",
  "  // NOTE: the message text lives in a CHILD join block, so stringifying `b.inputs` never sees it;",
  "  // walk the input subtree instead (this is exactly why an earlier attempt matched nothing).",
  "  const hasText = (v, needle, d) => {",
  "    if (!v || d > 20) return false;",
  "    if (Array.isArray(v)) {",
  "      if ((v[0] === 10 || v[0] === 4) && typeof v[1] === 'string') return v[1].indexOf(needle) >= 0;",
  "      return v.some((x) => hasText(x, needle, d + 1));",
  "    }",
  "    return false;",
  "  };",
  "  const deepText = (id, needle, d) => {",
  "    if (!id || d > 25 || typeof id !== 'string') return false;",
  "    const b = BL()[id];",
  "    if (!b) return false;",
  "    if (b.opcode === 'text' && String(b.fields.TEXT[0]).indexOf(needle) >= 0) return true;",
  "    if (Object.values(b.inputs || {}).some((v) => hasText(v, needle, 0))) return true;",
  "    return Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepText(v[1], needle, d + 1))",
  "      || deepText(b.next, needle, d + 1);",
  "  };",
  "  const cands = [];",
  "  for (const pc of ['atom %s', 'eval %s %s']) {",
  "    for (const id of reach(defIdOf(pc))) {",
  "      const b = BL()[id];",
  "      if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "      if (!deepText(id, 'is not defined', 0)) continue;",
  "      cands.push({ pc, id });",
  "    }",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
