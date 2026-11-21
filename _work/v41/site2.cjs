const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const id = 'tJy:^jGB4+#6n`,VS,[)';
const show = (bid, d) => {
  if (!bid || d > 8) return '?';
  const b = B[bid];
  if (!b) return JSON.stringify(bid);
  if (b.opcode === 'procedures_call') return b.mutation.proccode.replace(/%s/g, '_');
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + show(b.inputs.INDEX[1], d + 1) + ']';
  if (b.opcode === 'operator_equals') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '==' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_add') return '(' + show(b.inputs.NUM1[1], d + 1) + '+' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_and') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' and ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_not') return 'not ' + show(b.inputs.OPERAND[1], d + 1);
  if (b.opcode === 'operator_contains') return 'contains(' + show(b.inputs.STRING1[1], d + 1) + ',' + show(b.inputs.STRING2[1], d + 1) + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
const b = B[id];
console.log('cond = ' + show(b.inputs.CONDITION[1], 0));
for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
  if (!b.inputs[slot]) { console.log(slot + ': (none)'); continue; }
  console.log('--- ' + slot);
  let cur = b.inputs[slot][1];
  for (let i = 0; i < 12 && cur; i++) {
    console.log('  ' + i + ': ' + show(cur, 0).slice(0, 150));
    cur = B[cur].next;
  }
}
