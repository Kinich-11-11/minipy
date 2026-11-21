const fs = require('fs');
const p = '_work/v41/p263.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 去掉上一轮加的临时 fail 探针
s = s.split('\n').filter((l) => !l.includes("PZ52 kw lo=")).join('\n');
s = s.split('\n').filter((l) => !l.includes("// [PZ52] 探针")).join('\n');
// 2) 换成正确的定位：deepHas 找 `meth == 'update'`，并要求 owner 是 dictmeth
const from = s.slice(s.indexOf('  // 定位 dict 的 update 分支'), s.indexOf("  if (!upd) throw new Error"));
const to = [
  "  // 定位 dict 的 update 分支：条件里（沿块树）出现 `meth == 'update'`，且 owner 是 dictmeth",
  "  const deepHas = (id, pred, depth) => {",
  "    if (!id || depth > 80 || typeof id !== 'string') return false;",
  "    const b = BL()[id];",
  "    if (!b) return false;",
  "    if (pred(b)) return true;",
  "    if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;",
  "    return deepHas(b.next, pred, depth + 1);",
  "  };",
  "  const ownerOf = (id) => {",
  "    let cur = id;",
  "    for (let g = 0; g < 3000 && cur; g++) {",
  "      const par = BL()[cur].parent;",
  "      if (!par) return '?';",
  "      const pb = BL()[par];",
  "      if (pb.opcode === 'procedures_definition') return BL()[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');",
  "      cur = par;",
  "    }",
  "    return '?';",
  "  };",
  "  let upd = null;",
  "  for (const id of allIds()) {",
  "    const b = BL()[id];",
  "    if ((b.opcode !== 'control_if' && b.opcode !== 'control_if_else') || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;",
  "    if (ownerOf(id) !== 'dictmeth _ _ _ _ _') continue;",
  "    if (!deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals'",
  "      && (litOf(x.inputs.OPERAND2) === 'update' || litOf(x.inputs.OPERAND1) === 'update'), 0)) continue;",
  "    const head = BL()[b.inputs.SUBSTACK[1]];",
  "    if (head && head.opcode === 'procedures_call' && head.mutation && head.mutation.proccode === 'eval %s %s') { upd = id; break; }",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
