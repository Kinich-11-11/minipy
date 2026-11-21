// dump raw nested structure of conditions in a procedure that mention the given literal
// node _work/v41/rawcond.cjs <project.json> "<proccode>" "<litneedle>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
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
const needle = process.argv[4] || null;
// collect the literal chars compared anywhere inside a condition tree
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
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const raw = (d, ind) => {
  const pad = ' '.repeat(ind);
  if (d === null || d === undefined) return;
  const lit = chOf(d);
  if (lit !== null) { console.log(pad + 'lit ' + JSON.stringify(lit)); return; }
  if (Array.isArray(d) && (d[0] === 12 || d[0] === 13)) { console.log(pad + 'vardesc ' + JSON.stringify(d)); return; }
  if (Array.isArray(d) && d[0] === 2) { console.log(pad + 'BOOL ->'); raw([3, d[1]], ind + 2); return; }
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) { console.log(pad + 'blk? ' + id); return; }
    console.log(pad + b.opcode + ' ' + JSON.stringify(b.fields || {}));
    for (const [k, v] of Object.entries(b.inputs || {})) { console.log(pad + '  .' + k); raw(v, ind + 4); }
    return;
  }
  console.log(pad + JSON.stringify(d));
};
const def = defIdOf(process.argv[3]);
const seen = new Set();
const st = [B[def].next];
while (st.length) {
  const cur = st.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if ((b.opcode === 'control_if' || b.opcode === 'control_repeat_until' || b.opcode === 'control_if_else') && b.inputs.CONDITION) {
    const s = JSON.stringify(b.inputs.CONDITION);
    if (!needle || litSet(b.inputs.CONDITION).has(needle)) { console.log('=== condition of ' + b.opcode + ' ' + cur); raw(b.inputs.CONDITION, 0); }
  }
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
  if (b.next) st.push(b.next);
}
