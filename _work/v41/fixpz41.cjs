const fs = require('fs');
const p = '_work/v41/pz41.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const al = reach('), s.indexOf('  if (!bindLoop) throw new Error'));
const to = [
  "  const al = reach(defIdOf('assignlist %s'));",
  "  const asBlock = (v) => (v && typeof v[1] === 'string' ? BL()[v[1]] : null);",
  "  const asVarName = (v) => {",
  "    if (!Array.isArray(v)) return null;",
  "    if (v[0] === 12) return v[1];",
  "    if (Array.isArray(v[1]) && v[1][0] === 12) return v[1][1];",
  "    const blk = asBlock(v);",
  "    if (blk && blk.opcode === 'data_variable') return blk.fields.VARIABLE[0];",
  "    return null;",
  "  };",
  "  let bindCall = null;",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'assign %s %s %s') continue;",
  "    const vals = Object.values(b.inputs);",
  "    const first = asBlock(vals[0]);",
  "    if (first && first.opcode === 'data_itemoflist' && first.fields.LIST[0] === 'AName' && asVarName(vals[1]) === 'ev') bindCall = id;",
  "  }",
  "  if (!bindCall) throw new Error('[PZ41] no bind call');",
  "  let bindLoop = null;",
  "  {",
  "    let cur = bindCall;",
  "    for (let g = 0; g < 80 && cur; g++) {",
  "      const par = BL()[cur].parent;",
  "      if (!par) break;",
  "      if (BL()[par].opcode === 'control_repeat_until') { bindLoop = par; break; }",
  "      cur = par;",
  "    }",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
