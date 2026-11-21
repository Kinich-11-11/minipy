const fs = require('fs');
const proj = process.argv[2] || '_work/v41/_tz48proj.json';
const p = JSON.parse(fs.readFileSync(proj, 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const lit = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return lit(d[1]);
  return null;
};
const show = (id, d) => {
  if (!id || d > 9) return '?';
  const b = B[id];
  if (!b) return JSON.stringify(id);
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
  if (b.opcode === 'operator_gt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '>' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_lt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '<' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'data_lengthoflist') return 'len(' + b.fields.LIST[0] + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
const owner = (id) => {
  let cur = id;
  for (let g = 0; g < 1200 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
const tags = process.argv.slice(3);
for (const tag of tags) {
  let setter = null;
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'evtag' && lit(b.inputs.VALUE) === tag) setter = id;
  }
  if (!setter) { console.log(tag + ': setter not found'); continue; }
  const call = B[setter].next;
  const args = Object.keys(B[call].inputs).map((k) => show(B[call].inputs[k][1], 1));
  console.log(tag + ' owner=' + owner(call) + ' args=[' + args.join(' , ') + ']');
  let cur = call, found = 0;
  for (let g = 0; g < 1200 && cur && found < 3; g++) {
    const par = B[cur].parent;
    if (!par) break;
    const pb = B[par];
    if (pb.opcode === 'control_if' || pb.opcode === 'control_if_else') { console.log('    in-if: ' + show(pb.inputs.CONDITION[1], 0).slice(0, 150)); found++; }
    cur = par;
  }
}
