const fs = require('fs');
const p = '_work/v41/p252.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const gates = find(ev, (b) => b.opcode === 'control_if_else' && b.inputs.CONDITION";
const to = "  const gates = find(ev, (b) => (b.opcode === 'control_if_else' || b.opcode === 'control_if') && b.inputs.CONDITION";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
