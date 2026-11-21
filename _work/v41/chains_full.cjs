const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
// 完整（不截断）渲染
const show = (bid, d) => {
  if (!bid || d > 14) return '?';
  const b = B[bid];
  if (!b) return JSON.stringify(bid);
  if (b.opcode === 'procedures_call') {
    return b.mutation.proccode.replace(/%s/g, '_') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
  }
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + show(b.inputs.INDEX[1], d + 1) + ']';
  if (b.opcode === 'operator_equals') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' == ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_and') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' AND ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_or') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' OR ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_not') return 'NOT ' + show(b.inputs.OPERAND[1], d + 1);
  if (b.opcode === 'operator_add') return '(' + show(b.inputs.NUM1[1], d + 1) + ' + ' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_subtract') return '(' + show(b.inputs.NUM1[1], d + 1) + ' - ' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_gt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' > ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_lt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' < ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_join') return 'join(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(', ') + ')';
  if (b.opcode === 'operator_contains') return 'contains(' + show(b.inputs.STRING1[1], d + 1) + ', ' + show(b.inputs.STRING2[1], d + 1) + ')';
  if (b.opcode === 'data_lengthoflist') return 'len(' + b.fields.LIST[0] + ')';
  if (b.opcode === 'data_itemnumoflist') return 'itemnum(' + b.fields.LIST[0] + ', ' + show(b.inputs.ITEM[1], d + 1) + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(', ') + ')';
};
const ownerOf = (id) => {
  let cur = id;
  for (let g = 0; g < 1500 && cur; g++) {
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
  if (b.opcode !== 'procedures_call' || !b.mutation) continue;
  if (!['callfn %s %s %s', 'callfnW %s %s %s'].includes(b.mutation.proccode)) continue;
  if (ownerOf(id) !== 'eval _ _') continue;
  n++;
  console.log('=========================================================');
  console.log('SITE ' + n + ': ' + show(id, 0));
  let cur = id, level = 0;
  for (let g = 0; g < 4000 && cur && level < 12; g++) {
    const par = B[cur].parent;
    if (!par) { console.log('  [no more parents]'); break; }
    const pb = B[par];
    if (['control_if', 'control_if_else', 'control_repeat_until', 'control_repeat', 'control_for_each'].includes(pb.opcode)) {
      level++;
      console.log('  L' + level + ' ' + pb.opcode + ': ' + (pb.inputs.CONDITION ? show(pb.inputs.CONDITION[1], 0) : show(pb.inputs.TIMES ? pb.inputs.TIMES[1] : '', 0)));
    }
    if (pb.opcode === 'procedures_definition') { console.log('  [definition of ' + B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_') + ']'); break; }
    cur = par;
  }
}
console.log('total eval callfn sites = ' + n);
