const fs = require('fs');
const p = '_work/v41/p241.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const nargZero = (condId) => deepHas(condId, (x) => x.opcode === 'operator_equals' && nameOf(x.inputs.OPERAND1) === 'narg'\n    && Array.isArray(x.inputs.OPERAND2) && String(x.inputs.OPERAND2[1]) === '0', 0);";
const to = "  const litOf = (d) => {\n    if (!Array.isArray(d)) return null;\n    if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);\n    if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);\n    return null;\n  };\n  const nargZero = (condId) => deepHas(condId, (x) => x.opcode === 'operator_equals' && nameOf(x.inputs.OPERAND1) === 'narg'\n    && litOf(x.inputs.OPERAND2) === '0', 0);";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = "      return !!t && t.opcode === 'operator_add' && nameOf(t.inputs.NUM1) === 'lo'\n        && Array.isArray(t.inputs.NUM2) && String(t.inputs.NUM2[1]) === '2';";
const to2 = "      return !!t && t.opcode === 'operator_add' && nameOf(t.inputs.NUM1) === 'lo'\n        && litOf(t.inputs.NUM2) === '2';";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
