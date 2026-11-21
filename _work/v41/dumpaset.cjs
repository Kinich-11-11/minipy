const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const ownerOf = (id) => {
  let cur = id;
  for (let i = 0; i < 120 && cur; i++) {
    const q = B[cur];
    if (!q) return '?';
    if (q.opcode === 'procedures_definition') {
      const pr = B[q.inputs.custom_block[1]];
      return pr && pr.mutation ? String(pr.mutation.proccode) : '?';
    }
    cur = q.parent;
  }
  return '(toplevel)';
};
const short = (v) => {
  if (!Array.isArray(v)) return String(v);
  return JSON.stringify(v).slice(0, 90);
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'aset %s %s %s %s') continue;
  n++;
  console.log('--- #' + n + ' id=' + id + '  in ' + ownerOf(id));
  for (const k of Object.keys(b.inputs || {})) console.log('    ' + k + ' = ' + short(b.inputs[k]));
}
console.log('total aset call sites = ' + n);
