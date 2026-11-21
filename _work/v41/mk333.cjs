const fs = require('fs');
let s = fs.readFileSync('_work/v41/p331.txt', 'utf8');
const startMark = "  // 在 execute 里找那个守位";
const endMark = "  const eqB = T(IT).blocks[eqBlock];";
const i0 = s.indexOf(startMark), i1 = s.indexOf(endMark);
if (i0 < 0 || i1 < 0) { console.log('MISS'); process.exit(1); }
const repl = [
  "  // 找 G4：execute 里 then 分支调用 `indexset %s %s` 的那个 control_if（PZ91 已确认就是这个门）",
  "  const callsIn = (id, d, out) => {",
  "    if (!id || d > 30 || typeof id !== 'string') return out;",
  "    const q = T(IT).blocks[id];",
  "    if (!q) return out;",
  "    if (q.opcode === 'procedures_call' && q.mutation) out.push(String(q.mutation.proccode));",
  "    for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') callsIn(v[1], d + 1, out);",
  "    callsIn(q.next, d + 1, out);",
  "    return out;",
  "  };",
  "  let host = null;",
  "  for (const id of reach(defIdOf('execute'))) {",
  "    const b = T(IT).blocks[id];",
  "    if (!b || b.opcode !== 'control_if' || !b.inputs || !b.inputs.SUBSTACK) continue;",
  "    if (!callsIn(b.inputs.SUBSTACK[1], 0, []).some((c) => c.indexOf('indexset') === 0)) continue;",
  "    host = id; break;",
  "  }",
  "  if (!host) throw new Error('[P331] indexset gate not found');",
  "  // 在它的条件子树里找 `Tok[...] == \"=\"`，原地改成 OR(==\"=\", ==\",\")",
  "  let eqBlock = null;",
  "  const wantTok = (v) => {",
  "    const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : null;",
  "    const q = id ? T(IT).blocks[id] : null;",
  "    return !!(q && q.opcode === 'data_itemoflist' && q.fields.LIST && q.fields.LIST[0] === 'Tok');",
  "  };",
  "  const walkCond = (id, d) => {",
  "    if (!id || d > 14 || typeof id !== 'string' || eqBlock) return;",
  "    const q = T(IT).blocks[id];",
  "    if (!q || !q.inputs) return;",
  "    if (q.opcode === 'operator_equals' && litOf(q.inputs.OPERAND2) === '=' && wantTok(q.inputs.OPERAND1)) { eqBlock = id; return; }",
  "    for (const v of Object.values(q.inputs)) if (Array.isArray(v) && typeof v[1] === 'string') walkCond(v[1], d + 1);",
  "    walkCond(q.next, d + 1);",
  "  };",
  "  walkCond(T(IT).blocks[host].inputs.CONDITION[1], 0);",
  "  if (!eqBlock) throw new Error('[P331] Tok[..] == \"=\" not found in the indexset gate');",
  ""
].join('\n');
s = s.slice(0, i0) + repl + s.slice(i1);
// 把文档头里的编号也换掉
s = s.split('P331').join('P333');
fs.writeFileSync('_work/v41/p333.txt', s);
console.log('wrote p333.txt');