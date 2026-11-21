const fs = require('fs');
const p = '_work/v41/pz61.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'printbuf') sites.push(id);";
const to = [
  "    if (b.opcode !== 'data_setvariableto' || b.fields.VARIABLE[0] !== 'printbuf') continue;",
  "    if (!refsVar(b.inputs.VALUE, 'ev', 0)) continue;   // 只要追加点（值里用到 ev 的）",
  "    sites.push(id);"
].join('\n');
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const anchor = "  const pa = reach(defIdOf('printargs'));";
const helper = [
  "  const refsVar = (v, name, d) => {",
  "    if (!v || d > 12) return false;",
  "    if (Array.isArray(v) && v[0] === 12) return v[1] === name;",
  "    if (Array.isArray(v) && Array.isArray(v[1])) return refsVar(v[1], name, d + 1);",
  "    const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : (typeof v === 'string' ? v : null);",
  "    if (!id) return false;",
  "    const b = BL()[id]; if (!b) return false;",
  "    if (b.opcode === 'data_variable' && b.fields.VARIABLE[0] === name) return true;",
  "    return Object.values(b.inputs || {}).some((x) => refsVar(x, name, d + 1));",
  "  };",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, helper));
console.log('ok');
