const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const ownerOf = (id) => {
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
const describe = (v) => {
  if (!Array.isArray(v)) return JSON.stringify(v);
  const b = typeof v[1] === 'string' ? B[v[1]] : null;
  if (!b) return JSON.stringify(v).slice(0, 40);
  if (b.opcode === 'data_itemoflist') return 'item(' + b.fields.LIST[0] + '[' + (b.inputs.INDEX ? JSON.stringify(B[b.inputs.INDEX[1]] ? (B[b.inputs.INDEX[1]].fields && B[b.inputs.INDEX[1]].fields.VARIABLE ? '$' + B[b.inputs.INDEX[1]].fields.VARIABLE[0] : '?') : '?') : '?') + '])';
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  return b.opcode;
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'assign %s %s %s') continue;
  n++;
  const owner = ownerOf(id);
  if (!owner.startsWith('assignlist')) continue;
  console.log('--- assign call ' + n + ' in ' + owner + ' id=' + id);
  for (const k of Object.keys(b.inputs)) {
    console.log('    ' + k + ' = ' + describe(b.inputs[k]));
  }
}
console.log('total assign calls = ' + n);
