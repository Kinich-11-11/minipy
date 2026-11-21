const fs = require('fs');
const p = '_work/v41/pz44.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const loops = find(ev,'), s.indexOf('  console.log(\'[PZ44] candidate loops'));
const to = [
  "  // rank 扫描循环：体内有 `eop = Tok[ek]`（Tok 列表项、下标是变量 ek）",
  "  const isTokEk = (v) => {",
  "    if (!Array.isArray(v)) return false;",
  "    const blk = typeof v[1] === 'string' ? BL()[v[1]] : null;",
  "    const b = blk || (Array.isArray(v[1]) ? { opcode: v[1][0], fields: v[1][1], inputs: v[1][2] } : null);",
  "    if (!b) return false;",
  "    if (b.opcode !== 'data_itemoflist') return false;",
  "    if (!b.fields || b.fields.LIST[0] !== 'Tok') return false;",
  "    const idx = b.inputs && b.inputs.INDEX;",
  "    return !!idx && nameOf(idx) === 'ek';",
  "  };",
  "  const loops = find(ev, (b) => b.opcode === 'control_repeat' && b.inputs.SUBSTACK",
  "    && (function walk(id, d) {",
  "      if (!id || d > 20 || typeof id !== 'string') return false;",
  "      const x = BL()[id];",
  "      if (!x) return false;",
  "      if (x.opcode === 'data_setvariableto' && x.fields.VARIABLE[0] === 'eop' && isTokEk(x.inputs.VALUE)) return true;",
  "      if (Object.values(x.inputs || {}).some((v) => v && typeof v[1] === 'string' && walk(v[1], d + 1))) return true;",
  "      return walk(x.next, d + 1);",
  "    })(b.inputs.SUBSTACK[1], 0));",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
