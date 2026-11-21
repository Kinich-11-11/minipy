const fs = require('fs');
const p = '_work/v41/p252.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    && JSON.stringify(b.inputs.CONDITION).includes('pwrap'));";
const to = "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && JSON.stringify(x.inputs.OPERAND1 || '').includes('pwrap'), 0));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
