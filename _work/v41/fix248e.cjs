const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const bind = find(al, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'assign %s %s %s');";
const to = [
  "  const bind = [];",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'assign %s %s %s') continue;",
  "    const vn = b.inputs.vn;",
  "    const vnBlock = vn && typeof vn[1] === 'string' ? BL()[vn[1]] : null;",
  "    if (vnBlock && vnBlock.opcode === 'data_itemoflist' && vnBlock.fields.LIST[0] === 'AName') bind.push(id);",
  "  }"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
