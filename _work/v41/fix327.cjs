const fs = require('fs');
let s = fs.readFileSync('_work/v41/p327.txt', 'utf8');
const from = "    const a = c.inputs.OPERAND1;\n    const isMi = Array.isArray(a) && ((a[0] === 12 && a[1] === 'mi') || (typeof a[1] === 'string' && BL()[a[1]] && BL()[a[1]].opcode === 'data_variable' && BL()[a[1]].fields.VARIABLE[0] === 'mi'));\n    if (!isMi) continue;";
const to = [
  "    // 读名字：内联变量 [12,\"mi\",id]、或 [3,[12,\"mi\",id],[10,\"\"]]、或块",
  "    const readName = (v) => {",
  "      if (!Array.isArray(v)) return null;",
  "      if (v[0] === 12 && typeof v[1] === 'string') return v[1];",
  "      const id = typeof v[1] === 'string' ? v[1] : null;",
  "      const q = id ? BL()[id] : null;",
  "      if (q && q.opcode === 'data_variable') return q.fields.VARIABLE[0];",
  "      if (Array.isArray(v[1])) return readName(v[1]);",
  "      return null;",
  "    };",
  "    if (readName(c.inputs.OPERAND1) !== 'mi') continue;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p327.txt', s.replace(from, to));
console.log('ok');