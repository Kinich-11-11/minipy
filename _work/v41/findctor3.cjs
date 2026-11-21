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
const find = (set, pred) => { const out = []; for (const id of set) if (pred(B[id], id)) out.push(id); return out; };
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
const cfullInit = find(reach(cfDef), (b, id) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'cfull' && exprHas(id, '__init__'));
console.log('cfullInit', cfullInit);
const r = reach(cfullInit[0]);
console.log('reach size', r.size);
const ifs = find(r, (b) => b.opcode === 'control_if');
console.log('ifs', ifs.length, ifs.slice(0, 6));
const guards = find(r, (b) => b.opcode === 'control_if' && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string'
  && [...reach(B[b.inputs.SUBSTACK[1]])].some((x) => { const q = B[x]; return q && q.opcode === 'procedures_call' && q.mutation && q.mutation.proccode === 'calluser %s %s %s'; }));
console.log('guards', guards);
