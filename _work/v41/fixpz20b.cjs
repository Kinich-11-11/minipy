const fs = require('fs');
const p = '_work/v41/pz20.txt';
let s = fs.readFileSync(p, 'utf8');
const old = [
  "  const tc = one(find(al, (b) => b.opcode === 'control_if' && b.inputs.CONDITION",
  "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === 'L', 0)), 'type check');",
  "  before(tc, 'T');",
  "  after(tc, 't');"
].join('\n');
const nw = [
  "  const tcs = find(al, (b) => b.opcode === 'control_if' && b.inputs.CONDITION",
  "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === 'L', 0));",
  "  for (const tc of tcs) { before(tc, 'T'); after(tc, 't'); }"
].join('\n');
if (!s.includes(old)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(old, nw));
console.log('ok');
