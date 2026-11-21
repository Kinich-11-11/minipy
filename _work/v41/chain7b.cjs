const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const show = (bid, d) => {
  if (!bid || d > 12) return '?';
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
  if (b.opcode === 'operator_gt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '>' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_lt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '<' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
const gif = 'bcontro_g7fife4nr';
console.log('FULL COND: ' + show(B[gif].inputs.CONDITION[1], 0));
// 这个 if 之前的 12 条语句（看 spfound 等标志怎么来的）
const parent = B[gif].parent;
console.log('parent opcode=' + (parent ? B[parent].opcode : '?'));
let cur = B[gif].parent;
// 从定义体开始顺着链打印到 gif 之前
let defId = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_definition') {
    const pr = B[b.inputs.custom_block[1]];
    if (pr.mutation.proccode === 'eval %s %s') defId = id;
  }
}
const chain = [];
let c = B[defId].next;
for (let i = 0; i < 4000 && c; i++) { chain.push(c); if (c === gif) break; c = B[c].next; }
const idx = chain.indexOf(gif);
console.log('index of gate in top-level chain = ' + idx + ' / ' + chain.length);
for (let i = Math.max(0, idx - 10); i < idx; i++) {
  console.log('  before[' + i + ']: ' + show(chain[i], 0).slice(0, 150));
}
