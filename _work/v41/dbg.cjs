// dbg.cjs <project.json> <proccode> : find `cmp > 0` inside a proc and print its parent chain
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pc = process.argv[3];
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const asRef = (d) => {
  if (!Array.isArray(d)) return null;
  if (d[0] === 12) return { kind: 'var', name: d[1] };
  if ((d[0] === 4 || d[0] === 10) && typeof d[1] !== 'object') return { kind: 'lit', val: String(d[1]) };
  if (d[0] === 1 || d[0] === 2 || d[0] === 3) return asRef(d[1]);
  return null;
};
function reach(roots) {
  const seen = new Set();
  const st = (Array.isArray(roots) ? roots : [roots]).slice();
  while (st.length) {
    const id = st.pop();
    if (!id || seen.has(id)) continue;
    const b = B[id]; if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
  return seen;
}
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
    const q = B[b.inputs.custom_block[1]];
    if (q && q.mutation && q.mutation.proccode === pc) { def = id; break; }
  }
}
const inside = reach(def);
for (const id of inside) {
  const b = B[id];
  if (b.opcode !== 'operator_gt') continue;
  const r = asRef(b.inputs.OPERAND1);
  if (!r || r.name !== 'cmp') continue;
  console.log('gt ' + id + '  OPERAND1=' + JSON.stringify(r) + ' OPERAND2=' + JSON.stringify(asRef(b.inputs.OPERAND2)));
  let cur = id, g = 0;
  while (cur && g++ < 6) {
    console.log('   parent chain: ' + cur + ' ' + (B[cur] ? B[cur].opcode : 'MISSING'));
    cur = B[cur] ? B[cur].parent : null;
  }
}
