// list every operator_mathop block with its operator and owning procedure
// node _work/v41/listmathop.cjs <project.json>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const owner = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition') continue;
  const proto = B[b.inputs.custom_block[1]];
  const pc = proto && proto.mutation ? proto.mutation.proccode : '?';
  const seen = new Set(); const st = [id];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur); owner.set(cur, pc);
    const q = B[cur]; if (!q) continue;
    for (const v of Object.values(q.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (q.next) st.push(q.next);
  }
}
const counts = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'operator_mathop') continue;
  const op = b.fields.OPERATOR[0];
  const k = op + '  @' + (owner.get(id) || '?');
  counts.set(k, (counts.get(k) || 0) + 1);
}
for (const [k, n] of [...counts].sort()) console.log(String(n).padStart(3) + '  ' + k);
