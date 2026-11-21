// list the owning procedure of every `fail` call whose message starts with the given text
// node _work/v41/whofail.cjs <project.json> "<needle>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const needle = process.argv[3];
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
const litOf = (d) => (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') ? String(d[1])
  : (d && Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4) ? String(d[1][1]) : null);
const hits = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;
  const d = b.inputs[JSON.parse(b.mutation.argumentids)[0]];
  const s = litOf(d);
  if (s === null || !s.includes(needle)) continue;
  const pc = owner.get(id) || '?';
  hits.set(pc, (hits.get(pc) || 0) + 1);
}
for (const [pc, n] of [...hits].sort((a, b2) => b2[1] - a[1])) console.log(String(n).padStart(3) + '  ' + pc);
