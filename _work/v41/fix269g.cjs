const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const deepHasVar = (id, name, depth) => {'), s.indexOf('  const stripBody = REPEATU('));
const to = [
  "  // 输入槽里引用变量有两种形式：块 id（data_variable）**或内联描述符** [12,'ev',id]，两种都要认。",
  "  const refsVar = (v, name, depth) => {",
  "    if (!v || depth > 12) return false;",
  "    if (Array.isArray(v) && v[0] === 12) return v[1] === name;",
  "    if (Array.isArray(v) && Array.isArray(v[1])) return refsVar(v[1], name, depth + 1);",
  "    const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : (typeof v === 'string' ? v : null);",
  "    if (!id) return false;",
  "    const b = BL()[id];",
  "    if (!b) return false;",
  "    if (b.opcode === 'data_variable' && b.fields.VARIABLE[0] === name) return true;",
  "    return Object.values(b.inputs || {}).some((x) => refsVar(x, name, depth + 1));",
  "  };",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("    if (!deepHasVar(b.inputs.VALUE && b.inputs.VALUE[1], 'ev', 0)) continue;",
              "    if (!refsVar(b.inputs.VALUE, 'ev', 0)) continue;");
fs.writeFileSync(p, s);
console.log('ok');
