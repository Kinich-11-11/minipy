// find every block whose input/field mentions a given literal, with the owning procedure
// node _work/v41/findlit.cjs <project.json> <literal>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const owners = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  const pc = q && q.mutation ? q.mutation.proccode : '?';
  const seen = new Set(); const st = [id];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur); owners.set(cur, pc);
    const x = B[cur]; if (!x) continue;
    for (const v of Object.values(x.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (x.next) st.push(x.next);
  }
}
const scan = (d, out = []) => {
  if (d === undefined || d === null) return out;
  if (Array.isArray(d)) {
    if ((d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') { if (d[1].includes(want)) out.push(d[1]); return out; }
    for (const e of d) scan(e, out);
  }
  return out;
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  for (const [k, v] of Object.entries(b.inputs || {})) {
    const hits = scan(v);
    if (hits.length) { n++; console.log(id + ' ' + b.opcode + ' .' + k + ' = ' + JSON.stringify(hits[0]).slice(0, 120) + '   owner=' + owners.get(id)); }
  }
  for (const [k, v] of Object.entries(b.fields || {})) {
    if (Array.isArray(v) && typeof v[0] === 'string' && v[0].includes(want) && v[0].length < 200) { n++; console.log(id + ' ' + b.opcode + ' {' + k + '} = ' + JSON.stringify(v[0]).slice(0, 120) + '   owner=' + owners.get(id)); }
  }
}
console.log('blocks mentioning ' + JSON.stringify(want) + ': ' + n);
