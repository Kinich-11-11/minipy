const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const defIdOf = (pc) => {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
      const proto = B[b.inputs.custom_block[1]];
      if (proto && proto.mutation && proto.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
};
const reach = (root) => {
  const seen = new Set(); const st = [root];
  while (st.length) {
    const id = st.pop();
    if (!id || seen.has(id)) continue;
    const b = B[id]; if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
  return seen;
};
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const hasLit = (id, needle, d) => {
  if (!id || d > 20 || typeof id !== 'string') return false;
  const b = B[id]; if (!b) return false;
  if (Object.values(b.inputs || {}).some((v) => litOf(v) === needle)) return true;
  if (b.opcode === 'text' && String(b.fields.TEXT[0]) === needle) return true;
  if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && hasLit(v[1], needle, d + 1))) return true;
  return false;
};
const ev = reach(defIdOf('eval %s %s'));
let n = 0;
for (const id of ev) {
  const b = B[id];
  if (b.opcode !== 'control_if' && b.opcode !== 'control_if_else') continue;
  if (!b.inputs.CONDITION || !hasLit(b.inputs.CONDITION[1], 'key', 0)) continue;
  n++;
  console.log(n + ') ' + b.opcode + ' id=' + id + ' cond=' + JSON.stringify(b.inputs.CONDITION).slice(0, 80));
}
console.log('total conditions mentioning "key" in eval = ' + n);
