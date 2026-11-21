const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const parent = (id) => B[id] && B[id].parent;
const owner = (id) => { let c = id, d = 0; while (c && d++ < 90) { const b = B[c]; if (b && b.opcode === 'procedures_definition') { const q = B[b.inputs.custom_block[1]]; return q.mutation.proccode; } c = b && b.parent; } return '?'; };
const exprHas = (id, text) => {
  const seen = new Set(); const stack = [id];
  while (stack.length) {
    const x = stack.pop();
    if (!x || typeof x !== 'string' || seen.has(x)) continue;
    seen.add(x);
    const b = B[x];
    if (!b) continue;
    if (JSON.stringify(b.inputs || {}).includes(text)) return true;
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  }
  return false;
};
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'calluser %s %s %s') {
    console.log(id, owner(id), 'has_init=' + exprHas(id, '__init__'), JSON.stringify(Object.values(b.inputs)).slice(0, 120));
  }
}
