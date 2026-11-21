// errclear.cjs <project.json> : list every `set error = ""` site and which proc owns it
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
// map each block id to its owning proc definition name
const owner = new Map();
const procName = (defId) => {
  const d = B[defId];
  const proto = d && d.inputs && d.inputs.custom_block ? B[d.inputs.custom_block[1]] : null;
  return proto && proto.mutation ? proto.mutation.proccode : '(top)';
};
const walk = (id, name) => {
  const seen = new Set();
  const st = [id];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    const b = B[cur];
    if (!b) continue;
    if (b.opcode === 'procedures_definition') { name = procName(cur); }
    owner.set(cur, name);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
};
// seed from every top-level script and every proc definition
for (const id of Object.keys(B)) {
  if (B[id].topLevel || B[id].opcode === 'procedures_definition') walk(id, '(top)');
}
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'data_setvariableto' || !b.fields.VARIABLE || b.fields.VARIABLE[0] !== 'error') continue;
  const v = b.inputs.VALUE;
  const lit = Array.isArray(v) && Array.isArray(v[1]) && v[1][0] === 10 ? String(v[1][1]) : null;
  if (lit === '') { console.log('clear error in ' + (owner.get(id) || '?') + '  @' + id); n++; }
}
console.log('total clears: ' + n);
