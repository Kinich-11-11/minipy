// print the ancestor chain (opcode + condition rendering) of a block that contains a given literal
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
let target = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_call' && JSON.stringify(b.inputs || {}).includes(want)) { target = id; break; }
}
if (!target) throw new Error('not found');
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
function R(d) {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return t;
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (Array.isArray(d) && d[1] && d[1][0] === 13) return '@' + d[1][1];
  if (Array.isArray(d) && d[0] === 2) return R([3, d[1]]);
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
      case 'operator_join': return '(' + ar('STRING1') + '+' + ar('STRING2') + ')';
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len@' + (b.fields.LIST ? b.fields.LIST[0] : '?');
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'data_setvariableto': return 'SET ' + b.fields.VARIABLE[0] + '=' + ar('VALUE');
      case 'argument_reporter_string_number': return 'ARG:' + (b.fields.VALUE ? b.fields.VALUE[0] : '?');
      case 'procedures_call': return 'CALL ' + (b.mutation ? b.mutation.proccode : '?');
      default: return b.opcode + '{' + Object.keys(b.inputs || {}).map((k) => k + '=' + R(b.inputs[k])).join(',') + '}';
    }
  }
  return '?';
}
let cur = target, depth = 0;
while (cur && depth++ < 25) {
  const b = B[cur];
  console.log(depth + ' ' + cur + ' ' + b.opcode + (b.fields && b.fields.VARIABLE ? ' $' + b.fields.VARIABLE[0] : '') + (b.inputs && b.inputs.CONDITION ? '  IF ' + R(b.inputs.CONDITION) : ''));
  cur = b.parent;
}
