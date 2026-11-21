const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
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
let hit = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'cfull' && exprHas(id, '__init__')) { hit = id; break; }
}
console.log('cfull init =', hit);
let cur = hit, n = 0;
while (cur && n++ < 12) {
  const b = B[cur];
  console.log(' ', cur, b.opcode, JSON.stringify(b.inputs || {}).slice(0, 90));
  if (b.opcode === 'control_if' && b.inputs.SUBSTACK) {
    let s = b.inputs.SUBSTACK[1];
    console.log('   SUBSTACK:');
    while (s) { const q = B[s]; console.log('     ', s, q.opcode, q.mutation ? q.mutation.proccode : '', JSON.stringify(q.inputs || {}).slice(0, 70)); s = q.next; }
  }
  cur = b.next;
}
