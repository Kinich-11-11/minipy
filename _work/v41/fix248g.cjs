const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "    const vals = Object.values(b.inputs);",
  "    const first = vals[0] && typeof vals[0][1] === 'string' ? BL()[vals[0][1]] : null;",
  "    const second = vals[1] && typeof vals[1][1] === 'string' ? BL()[vals[1][1]] : null;",
  "    if (first && first.opcode === 'data_itemoflist' && first.fields.LIST[0] === 'AName'",
  "      && second && second.opcode === 'data_variable' && second.fields.VARIABLE[0] === 'ev') bind.push(id);"
].join('\n');
const to = [
  "    const vals = Object.values(b.inputs);",
  "    // 输入值有两种形态：块引用 [3,id,shadow]，或内联描述符 [12,'name',id]",
  "    const asBlock = (v) => (v && typeof v[1] === 'string' ? BL()[v[1]] : null);",
  "    const asVarName = (v) => {",
  "      if (!Array.isArray(v)) return null;",
  "      if (v[0] === 12) return v[1];",
  "      const blk = asBlock(v);",
  "      if (blk && blk.opcode === 'data_variable') return blk.fields.VARIABLE[0];",
  "      return null;",
  "    };",
  "    const first = asBlock(vals[0]);",
  "    if (first && first.opcode === 'data_itemoflist' && first.fields.LIST[0] === 'AName'",
  "      && asVarName(vals[1]) === 'ev') bind.push(id);"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
