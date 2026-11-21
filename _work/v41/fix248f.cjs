const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const bind = [];",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'assign %s %s %s') continue;",
  "    const vn = b.inputs.vn;",
  "    const vnBlock = vn && typeof vn[1] === 'string' ? BL()[vn[1]] : null;",
  "    if (vnBlock && vnBlock.opcode === 'data_itemoflist' && vnBlock.fields.LIST[0] === 'AName') bind.push(id);",
  "  }"
].join('\n');
const to = [
  "  // 形参 id 是哈希过的，不能用 .inputs.vn；按\"第一个输入是 AName[...]、第二个是变量 ev\"来认。",
  "  const bind = [];",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'assign %s %s %s') continue;",
  "    const vals = Object.values(b.inputs);",
  "    const first = vals[0] && typeof vals[0][1] === 'string' ? BL()[vals[0][1]] : null;",
  "    const second = vals[1] && typeof vals[1][1] === 'string' ? BL()[vals[1][1]] : null;",
  "    if (first && first.opcode === 'data_itemoflist' && first.fields.LIST[0] === 'AName'",
  "      && second && second.opcode === 'data_variable' && second.fields.VARIABLE[0] === 'ev') bind.push(id);",
  "  }"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
