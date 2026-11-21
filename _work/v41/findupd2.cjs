const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const nameOf = (d) => {
  if (!Array.isArray(d)) return null;
  if (d[0] === 12) return d[1];
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return nameOf(d[1]);
  const id = typeof d === 'string' ? d : (typeof d[1] === 'string' ? d[1] : null);
  const b = id ? B[id] : null;
  if (!b) return null;
  if (b.opcode === 'data_variable') return b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return b.fields.VALUE[0];
  return null;
};
const deepHas = (id, pred, depth) => {
  if (!id || depth > 80 || typeof id !== 'string') return false;
  const b = B[id];
  if (!b) return false;
  if (pred(b)) return true;
  if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;
  return deepHas(b.next, pred, depth + 1);
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
  if ((b.opcode !== 'control_if' && b.opcode !== 'control_if_else') || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;
  const hit = deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals'
    && (litOf(x.inputs.OPERAND2) === 'update' || litOf(x.inputs.OPERAND1) === 'update'), 0);
  if (!hit) continue;
  n++;
  console.log('--- update-if ' + n + ' id=' + id + ' owner=' + owner(id));
  let cur = b.inputs.SUBSTACK[1];
  for (let i = 0; i < 4 && cur; i++, cur = B[cur].next) {
    const x = B[cur];
    console.log('    body[' + i + '] ' + x.opcode + ' ' + (x.mutation ? x.mutation.proccode : ''));
  }
}
console.log('total update-ifs = ' + n);
