const fs = require('fs');
let s = fs.readFileSync('_work/v41/p398.txt', 'utf8');
const from = `    if (!addHi1 && q.opcode === 'data_addtolist' && q.inputs && q.inputs.ITEM) {
      const it = q.inputs.ITEM[1];
      const w = typeof it === 'string' ? BB[it] : null;
      if (w && w.opcode === 'operator_add') {
        const a = w.inputs.NUM1, b = w.inputs.NUM2;
        const nameOf = (v) => { const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : null; const p = id ? BB[id] : null; return p && p.opcode === 'argument_reporter_string_number' && p.fields.VALUE ? p.fields.VALUE[0] : null; };
        const litOf = (v) => (Array.isArray(v) && (v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') ? String(v[1]) : null;
        if ((nameOf(a) === 'hi' && litOf(b) === '1') || (nameOf(b) === 'hi' && litOf(a) === '1')) addHi1 = c;
      }
    }`;
const to = `    if (!addHi1 && q.opcode === 'data_addtolist' && q.fields && q.fields.LIST && q.fields.LIST[0] === 'MComma' && q.inputs && q.inputs.ITEM) {
      const it = q.inputs.ITEM[1];
      const w = typeof it === 'string' ? BB[it] : null;
      if (w && w.opcode === 'operator_add') addHi1 = c;
    }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p398.txt', s.replace(from, to));
console.log('simplified addHi1 detection');