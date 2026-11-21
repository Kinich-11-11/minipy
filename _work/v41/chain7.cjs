const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const show = (bid, d) => {
  if (!bid || d > 9) return '?';
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
  if (b.opcode === 'operator_join') return 'join(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
// 找到 eval 里唯一的 calluser 调用
let target = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'calluser %s %s %s') {
    // 是否在 eval 里
    let cur = id;
    for (let g = 0; g < 900 && cur; g++) {
      const par = B[cur].parent;
      if (!par) break;
      const pb = B[par];
      if (pb.opcode === 'procedures_definition') {
        if (B[pb.inputs.custom_block[1]].mutation.proccode === 'eval %s %s') target = id;
        break;
      }
      cur = par;
    }
  }
}
console.log('target calluser id = ' + target);
console.log('args = [' + Object.keys(B[target].inputs).map((k) => show(B[target].inputs[k][1], 1)).join(' , ') + ']');
let cur = target, level = 0;
for (let g = 0; g < 3000 && cur && level < 8; g++) {
  const par = B[cur].parent;
  if (!par) { console.log('no more parents'); break; }
  const pb = B[par];
  if (pb.opcode === 'control_if' || pb.opcode === 'control_if_else') {
    level++;
    console.log('level ' + level + ' (' + par + '): ' + show(pb.inputs.CONDITION[1], 0).slice(0, 210));
  }
  if (pb.opcode === 'procedures_definition') { console.log('reached definition'); break; }
  cur = par;
}
