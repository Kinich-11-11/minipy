const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const lit = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return lit(d[1]);
  return null;
};
const deepHas = (id, pred, depth) => {
  if (!id || depth > 60 || typeof id !== 'string') return false;
  const b = B[id];
  if (!b) return false;
  if (pred(b)) return true;
  if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;
  return deepHas(b.next, pred, depth + 1);
};
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
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if' && b.opcode !== 'control_if_else') continue;
  if (!b.inputs.CONDITION) continue;
  if (owner(id) !== 'eval _ _') continue;
  const hasOpen = deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && lit(x.inputs.OPERAND2) === '(', 0);
  const hasClose = deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && lit(x.inputs.OPERAND2) === ')', 0);
  if (!(hasOpen && hasClose)) continue;
  n++;
  const branch = b.inputs.SUBSTACK ? show(b.inputs.SUBSTACK[1], 0).slice(0, 60) : '(none)';
  const branch2 = b.inputs.SUBSTACK2 ? show(b.inputs.SUBSTACK2[1], 0).slice(0, 60) : '(none)';
  console.log(n + ') id=' + id + '\n   cond=' + show(b.inputs.CONDITION[1], 0).slice(0, 190) + '\n   sub1=' + branch + '  sub2=' + branch2);
}
console.log('total paren-gate ifs in eval = ' + n);
