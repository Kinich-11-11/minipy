// print the eval() dispatch chain around the methodcall branch
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const R = (d) => {
  if (d === undefined || d === null) return '?';
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return 'blk';
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_equals': return '(' + ar('OPERAND1') + ' == ' + ar('OPERAND2') + ')';
      case 'operator_lt': return '(' + ar('OPERAND1') + ' < ' + ar('OPERAND2') + ')';
      case 'operator_gt': return '(' + ar('OPERAND1') + ' > ' + ar('OPERAND2') + ')';
      case 'operator_and': return '(' + ar('OPERAND1') + ' and ' + ar('OPERAND2') + ')';
      case 'operator_or': return '(' + ar('OPERAND1') + ' or ' + ar('OPERAND2') + ')';
      case 'operator_not': return '!' + ar('OPERAND');
      case 'operator_contains': return '(' + ar('STRING1') + ' in ' + ar('STRING2') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'ARG:' + b.fields.VALUE[0];
      case 'procedures_call': return 'CALL ' + b.mutation.proccode;
      default: return b.opcode + '{' + Object.keys(b.inputs || {}).map((k) => k + '=' + R(b.inputs[k])).join(',') + '}';
    }
  }
  return '?';
};
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === 'eval %s %s') { def = id; break; }
}
let cur = B[def].next, n = 0;
while (cur && n++ < 400) {
  const b = B[cur];
  const sub = b.inputs && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string' ? B[b.inputs.SUBSTACK[1]] : null;
  const sub2 = b.inputs && b.inputs.SUBSTACK2 && typeof b.inputs.SUBSTACK2[1] === 'string' ? B[b.inputs.SUBSTACK2[1]] : null;
  if (b.opcode.startsWith('control_if')) {
    console.log(cur + ' ' + b.opcode + '  IF ' + R(b.inputs.CONDITION) + '   [sub=' + (sub ? sub.opcode + ':' + (sub.mutation ? sub.mutation.proccode : '') : '-') + ' sub2=' + (sub2 ? sub2.opcode : '-') + ']');
  }
  cur = b.next;
}
