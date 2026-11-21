const fs = require('fs');
const p = '_work/v41/p252.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'data_itemoflist' && x.fields.LIST[0] === 'pwrap', 0));";
const to = "    && JSON.stringify(b.inputs.CONDITION).includes('pwrap'));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
