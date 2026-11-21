const fs = require('fs');
const p = '_work/v41/p240.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === '('\n      && nameOf(x.inputs.OPERAND1) === 'lo', 0)\n    && b.inputs.SUBSTACK\n    && deepHas(b.inputs.SUBSTACK[1], (x) => x.opcode === 'data_setvariableto' && x.fields.VARIABLE[0] === 'cpi', 0));";
const to = "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === '(', 0)\n    && b.inputs.SUBSTACK\n    && deepHas(b.inputs.SUBSTACK[1], (x) => x.opcode === 'data_setvariableto' && x.fields.VARIABLE[0] === 'cpi', 0)\n    && deepHas(b.inputs.SUBSTACK[1], (x) => x.opcode === 'data_setvariableto' && x.fields.VARIABLE[0] === 'cpd', 0)\n    && !deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && nameOf(x.inputs.OPERAND1) === 'lo', 0));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
