const fs = require('fs');
const p = '_work/v41/p246.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const closeSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgs' && litOfV(b.inputs.VALUE) === '');";
const to = "  const closeSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgs' && litOfV(b.inputs.VALUE) === ''\n    && BL()[b.parent] && BL()[b.parent].opcode === 'control_if');   // 只取"闭合"那一处（另一处是行首复位）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
