const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const lit = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
function defIdOf(pc) {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = B[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
const def = defIdOf(process.argv[3] || 'tokenize %s');
// walk the whole subtree and report every control_if / control_if_else with its condition opcode
const seen = new Set();
const stack = [B[def].next];
while (stack.length) {
  const cur = stack.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'control_if' || b.opcode === 'control_if_else' || b.opcode === 'control_repeat_until' || b.opcode === 'control_repeat') {
    const c = b.inputs.CONDITION;
    const cb = (c && typeof c[1] === 'string') ? B[c[1]] : null;
    console.log(cur, b.opcode, 'cond=' + (cb ? cb.opcode : 'none'), cb ? ('lit1=' + lit(cb.inputs.STRING1) + ' lit2=' + lit(cb.inputs.STRING2)) : '');
  }
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
