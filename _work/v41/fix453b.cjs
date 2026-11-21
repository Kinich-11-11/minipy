const fs = require('fs');
let s = fs.readFileSync('_work/v41/p453.txt', 'utf8');
const from = "if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.opcode === 'argument_reporter_string_number' && w.fields && w.fields.VALUE) out.push(w.fields.VALUE[0]); if (w.inputs) for (const x of Object.values(w.inputs)) items(x, out); return; }";
const to = "if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.fields && w.fields.VARIABLE) out.push(w.fields.VARIABLE[0]); if (w.opcode === 'argument_reporter_string_number' && w.fields && w.fields.VALUE) out.push(w.fields.VALUE[0]); if (w.inputs) for (const x of Object.values(w.inputs)) items(x, out); return; }";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p453.txt', s.replace(from, to));
console.log('collector fixed');