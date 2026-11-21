const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const show = (bid, d) => {
  if (!bid || d > 9) return '?';
  const b = B[bid];
  if (!b) return JSON.stringify(bid);
  if (b.opcode === 'procedures_call') return b.mutation.proccode.replace(/%s/g, '_') + '(' + Object.values(b.inputs).map((v) => show(v[1], d + 1)).join(',') + ')';
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + show(b.inputs.INDEX[1], d + 1) + ']';
  if (b.opcode === 'operator_and') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' AND ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_or') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' OR ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_not') return 'NOT ' + show(b.inputs.OPERAND[1], d + 1);
  if (b.opcode === 'operator_equals') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '==' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_gt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '>' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_add') return '(' + show(b.inputs.NUM1[1], d + 1) + '+' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_subtract') return '(' + show(b.inputs.NUM1[1], d + 1) + '-' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_length') return 'len(' + show(b.inputs.STRING[1], d + 1) + ')';
  if (b.opcode === 'text') return JSON.stringify(b.fields.TEXT[0]);
  if (b.opcode === 'data_lengthoflist') return 'llen(' + b.fields.LIST[0] + ')';
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[..]';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
for (const id of ['bcontro_jkx36thdu', 'bcontro_bo8bqyyct', 'bcontro_boin4ad96']) {
  const b = B[id];
  console.log('=== ' + id + ' (' + b.opcode + ')');
  console.log('  COND: ' + show(b.inputs.CONDITION[1], 0));
  if (b.inputs.SUBSTACK) console.log('  SUB head: ' + (B[b.inputs.SUBSTACK[1]] ? B[b.inputs.SUBSTACK[1]].opcode : '?'));
  if (b.inputs.SUBSTACK2) console.log('  SUB2 head: ' + (B[b.inputs.SUBSTACK2[1]] ? B[b.inputs.SUBSTACK2[1]].opcode : '?'));
}
