// node _work/v41/findkindset.cjs <project.json>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const owner = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
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
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'data_setvariableto') continue;
  if (!b.fields.VARIABLE || b.fields.VARIABLE[0] !== 'evtype') continue;
  const v = b.inputs.VALUE;
  const q = (v && typeof v[1] === 'string') ? B[v[1]] : null;
  if (!q || q.opcode !== 'data_itemoflist') continue;
  const ix = q.inputs.INDEX;
  const ib = (ix && typeof ix[1] === 'string') ? B[ix[1]] : null;
  console.log(id + '  list=' + (q.fields.LIST ? q.fields.LIST[0] : '?') + '  index=' + (ib ? ib.opcode + ':' + (ib.fields.VALUE ? ib.fields.VALUE[0] : '') : JSON.stringify(ix)) + '  owner=' + owner.get(id));
}
