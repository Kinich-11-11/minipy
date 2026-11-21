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
const cf = reach(defIdOf('callfn %s %s %s'));
let n = 0;
for (const id of cf) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;
  n++;
  const texts = [];
  const walk = (x, d) => {
    if (!x || d > 20 || typeof x !== 'string') return;
    const q = B[x]; if (!q) return;
    if (q.opcode === 'text') texts.push(String(q.fields.TEXT[0]));
    for (const v of Object.values(q.inputs || {})) {
      if (v && typeof v[1] === 'string') walk(v[1], d + 1);
      const l = litOf(v); if (l) texts.push(l);
    }
    walk(q.next, d + 1);
  };
  const inp = b.inputs[Object.keys(b.inputs)[0]];
  walk(inp && inp[1], 0);
  console.log(n + ') ' + id + ' :: ' + JSON.stringify(texts.join('|')).slice(0, 110));
}
console.log('callfn fail sites = ' + n);
