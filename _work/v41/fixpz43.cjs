const fs = require('fs');
const p = '_work/v41/pz43.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const sites = find(ev, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'",
  "    && Object.values(b.inputs).some((v) => {",
  "      const t = Array.isArray(v) && typeof v[1] === 'string' ? BL()[v[1]] : null;",
  "      if (!t) return false;",
  "      if (t.opcode === 'text') return t.fields.TEXT[0] === 'SyntaxError: parentheses';",
  "      return false;",
  "    }));"
].join('\n');
const to = [
  "  const litOf = (d) => {",
  "    if (!Array.isArray(d)) return null;",
  "    if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);",
  "    if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);",
  "    return null;",
  "  };",
  "  const sites = find(ev, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'",
  "    && Object.values(b.inputs).some((v) => litOf(v) === 'SyntaxError: parentheses'));"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
