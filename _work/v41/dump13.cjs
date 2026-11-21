const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const T = p.targets;
const IT = T.findIndex((t) => t.name === 'Interpreter');
const B = T[IT].blocks;
const defs = [];
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_definition') {
    const proto = B[b.inputs.custom_block[1]];
    if (proto && proto.mutation) defs.push([proto.mutation.proccode, id]);
  }
}
const defId = (pc) => { const f = defs.find((d) => d[0] === pc); return f ? f[1] : null; };
const reach = (root) => {
  const seen = new Set();
  const st = [root];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur) || !B[cur]) continue;
    seen.add(cur);
    for (const v of Object.values(B[cur].inputs || {})) {
      if (!Array.isArray(v)) continue;
      for (const x of v) if (typeof x === 'string' && B[x]) st.push(x);
    }
    if (B[cur].next) st.push(B[cur].next);
  }
  return seen;
};
console.log('=== substr calls in eval ===');
const ev = reach(defId('eval %s %s'));
for (const id of ev) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'substr %s %s %s') continue;
  console.log(id + ' :: ' + JSON.stringify(b.inputs).slice(0, 230));
}
console.log('=== blocks mentioning tnm in execute ===');
const ex = reach(defId('execute'));
let n = 0;
for (const id of ex) {
  const b = B[id];
  const j = JSON.stringify(b);
  if (j.indexOf('tnm') < 0) continue;
  n++;
  if (n > 10) break;
  console.log(n + ') ' + id + ' ' + b.opcode + ' parent=' + b.parent + ' :: ' + j.slice(0, 200));
}
console.log('total tnm blocks = ' + n);
