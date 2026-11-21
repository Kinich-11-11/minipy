const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
function reach(roots) {
  const seen = new Set();
  const stack = (Array.isArray(roots) ? roots : [roots]).slice();
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const b = B[id];
    if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') stack.push(v[1]); }
    if (b.next) stack.push(b.next);
  }
  return seen;
}
const defOf = (pc) => {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = B[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  return null;
};
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
const cfDef = defOf('callfn %s %s %s');
const roots = [...reach(cfDef)].filter((id) => B[id].opcode === 'data_setvariableto' && B[id].fields.VARIABLE && B[id].fields.VARIABLE[0] === 'cfull' && exprHas(id, '__init__'));
console.log('roots', roots);
for (const start of roots) {
  const r = [...reach(start)];
  const ifs = r.filter((id) => B[id].opcode === 'control_if');
  for (const i of ifs) {
    const sub = B[i].inputs.SUBSTACK && B[i].inputs.SUBSTACK[1];
    let has = false;
    if (typeof sub === 'string') {
      for (const x of reach(sub)) { const q = B[x]; if (q && q.opcode === 'procedures_call' && q.mutation && q.mutation.proccode === 'calluser %s %s %s') has = true; }
    }
    console.log('if', i, 'sub=' + sub, 'hasCalluser=' + has);
  }
}
