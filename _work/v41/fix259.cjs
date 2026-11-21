const fs = require('fs');
const p = '_work/v41/p259.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const nBranch = find(ev, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.SUBSTACK",
  "    && litOf(b.inputs.CONDITION[1]) === null",
  "    && Object.values(b.inputs.CONDITION).some((v) => litOf(v) === 'n')",
  "    && find([b.inputs.SUBSTACK[1]], () => true).length === 1",
  "    && (function walk(id, d) {"
].join('\n');
const to = [
  "  const deepHas = (id, pred, depth) => {",
  "    if (!id || depth > 60 || typeof id !== 'string') return false;",
  "    const b = BL()[id];",
  "    if (!b) return false;",
  "    if (pred(b)) return true;",
  "    if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;",
  "    return deepHas(b.next, pred, depth + 1);",
  "  };",
  "  const nBranch = find(ev, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.SUBSTACK",
  "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === 'n', 0)",
  "    && (function walk(id, d) {"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
