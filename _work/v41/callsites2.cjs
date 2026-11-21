const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const show = (bid, d) => {
  if (!bid || d > 8) return '?';
  const b = B[bid];
  if (!b) return JSON.stringify(bid);
  if (b.opcode === 'procedures_call') return b.mutation.proccode.replace(/%s/g, '_');
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + show(b.inputs.INDEX[1], d + 1) + ']';
  if (b.opcode === 'operator_add') return '(' + show(b.inputs.NUM1[1], d + 1) + '+' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_subtract') return '(' + show(b.inputs.NUM1[1], d + 1) + '-' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_equals') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '==' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_and') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' and ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_or') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' or ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_not') return 'not ' + show(b.inputs.OPERAND[1], d + 1);
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
const owner = (id) => {
  let cur = id;
  for (let g = 0; g < 900 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
const want = ['callfn %s %s %s', 'callfnW %s %s %s', 'calluser %s %s %s', 'callmeth %s %s %s %s', 'callmethW %s %s %s %s'];
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || !want.includes(b.mutation.proccode)) continue;
  if (owner(id) !== 'eval _ _') continue;
  n++;
  const args = Object.keys(b.inputs).map((k) => show(b.inputs[k][1], 1));
  console.log(n + ') ' + b.mutation.proccode.replace(/%s/g, '_') + ' id=' + id + ' args=[' + args.join(' , ') + ']');
  let cur = id, found = 0;
  for (let g = 0; g < 900 && cur && found < 4; g++) {
    const par = B[cur].parent;
    if (!par) break;
    const pb = B[par];
    if (pb.opcode === 'control_if' || pb.opcode === 'control_if_else') { console.log('     in-if: ' + show(pb.inputs.CONDITION[1], 0).slice(0, 170)); found++; }
    cur = par;
  }
}
console.log('total call sites in eval = ' + n);
