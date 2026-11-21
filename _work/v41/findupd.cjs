const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const owner = (id) => {
  let cur = id;
  for (let g = 0; g < 2000 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;
  const j = JSON.stringify(b.inputs.CONDITION);
  if (!j.includes('"update"')) continue;
  n++;
  console.log('--- update-if ' + n + ' id=' + id + ' owner=' + owner(id));
  console.log('    cond=' + j.slice(0, 140));
  let cur = b.inputs.SUBSTACK[1];
  for (let i = 0; i < 4 && cur; i++, cur = B[cur].next) {
    const x = B[cur];
    console.log('    body[' + i + '] ' + x.opcode + ' ' + (x.mutation ? x.mutation.proccode : JSON.stringify(x.fields || {}).slice(0, 40)));
  }
}
console.log('total update-ifs = ' + n);
