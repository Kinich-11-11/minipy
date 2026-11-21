const fs = require('fs');
let s = fs.readFileSync('_work/v41/p331.txt', 'utf8');
const from = s.slice(s.indexOf("  // 找它外层 control_if 的条件里那条"), s.indexOf("  const eqB = BL()[eqBlock];"));
const to = [
  "  // 在 execute 里找那个守位：条件是 control_if，且子树里含 `Tok[...] == \"=\"`",
  "  const ex = reach(defIdOf('execute'));",
  "  let host = null, eqBlock = null;",
  "  const walkCond = (id, d) => {",
  "    if (!id || d > 12 || typeof id !== 'string' || eqBlock) return;",
  "    const q = T(IT).blocks[id];",
  "    if (!q || !q.inputs) return;",
  "    if (q.opcode === 'operator_equals' && litOf(q.inputs.OPERAND2) === '=') {",
  "      const l = q.inputs.OPERAND1;",
  "      const bid = Array.isArray(l) && typeof l[1] === 'string' ? l[1] : null;",
  "      const bq = bid ? T(IT).blocks[bid] : null;",
  "      if (bq && bq.opcode === 'data_itemoflist' && bq.fields.LIST && bq.fields.LIST[0] === 'Tok') { eqBlock = id; return; }",
  "    }",
  "    for (const v of Object.values(q.inputs)) if (Array.isArray(v) && typeof v[1] === 'string') walkCond(v[1], d + 1);",
  "    walkCond(q.next, d + 1);",
  "  };",
  "  for (const id of ex) {",
  "    const b = T(IT).blocks[id];",
  "    if (!b || b.opcode !== 'control_if' || !b.inputs || !b.inputs.CONDITION) continue;",
  "    const save = eqBlock; eqBlock = null;",
  "    walkCond(b.inputs.CONDITION[1], 0);",
  "    if (eqBlock) { host = id; break; }",
  "    eqBlock = save;",
  "  }",
  "  if (!host || !eqBlock) throw new Error('[P331] guard / Tok==\"=\" not found in execute');",
  ""
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("  const eqB = BL()[eqBlock];", "  const eqB = T(IT).blocks[eqBlock];");
fs.writeFileSync('_work/v41/p331.txt', s);
console.log('rewrote guard locator');