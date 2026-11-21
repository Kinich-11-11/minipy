const fs = require('fs');
const p = '_work/v41/p236.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && nameOf(x.inputs.OPERAND1) === 'lo', 0)\n";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, ''));
console.log('ok');
