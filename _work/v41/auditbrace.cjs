// audit: every control block whose condition compares against '(' or '[' but never '{'
// node _work/v41/auditbrace.cjs <project.json>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const litSet = (d, seen = new Set(), out = new Set()) => {
  if (d === null || d === undefined) return out;
  const lit = chOf(d);
  if (lit !== null) { out.add(lit); return out; }
  if (Array.isArray(d)) {
    if (d[0] === 2) return litSet([3, d[1]], seen, out);
    if (typeof d[1] === 'string') return litSet(d[1], seen, out);
    for (const e of d) litSet(e, seen, out);
    return out;
  }
  if (typeof d === 'string') {
    if (seen.has(d)) return out;
    seen.add(d);
    const b = B[d];
    if (!b) return out;
    for (const v of Object.values(b.inputs || {})) litSet(v, seen, out);
  }
  return out;
};
// map block -> owning procedure
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
const hits = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (!b.inputs || !b.inputs.CONDITION) continue;
  const s = litSet(b.inputs.CONDITION);
  if ((s.has('(') || s.has('[')) && !s.has('{')) {
    const pc = owner.get(id) || '?';
    hits.set(pc, (hits.get(pc) || 0) + 1);
  }
}
for (const [pc, n] of [...hits].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(3) + '  ' + pc);
console.log('procedures with brace-blind scans: ' + hits.size);
