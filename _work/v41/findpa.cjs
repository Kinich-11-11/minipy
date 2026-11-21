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
const refsVar = (v, name, d) => {
  if (!v || d > 12) return false;
  if (Array.isArray(v) && v[0] === 12) return v[1] === name;
  if (Array.isArray(v) && Array.isArray(v[1])) return refsVar(v[1], name, d + 1);
  const id = Array.isArray(v) && typeof v[1] === 'string' ? v[1] : (typeof v === 'string' ? v : null);
  if (!id) return false;
  const b = B[id]; if (!b) return false;
  if (b.opcode === 'data_variable' && b.fields.VARIABLE[0] === name) return true;
  return Object.values(b.inputs || {}).some((x) => refsVar(x, name, d + 1));
};
const pa = reach(defIdOf('printargs'));
let n = 0;
for (const id of pa) {
  const b = B[id];
  if (!b.opcode.startsWith('data_')) continue;
  const j = JSON.stringify(b.fields || {});
  if (j.indexOf('VARIABLE') < 0 && j.indexOf('LIST') < 0) continue;
  const hasEv = Object.values(b.inputs || {}).some((v) => refsVar(v, 'ev', 0));
  if (!hasEv) continue;
  n++;
  console.log(n + ') ' + b.opcode + ' ' + j.slice(0, 60) + ' id=' + id);
}
console.log('total = ' + n);
