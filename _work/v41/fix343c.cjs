const fs = require('fs');
let s = fs.readFileSync('_work/v41/p343.txt', 'utf8');
const from = [
  '  const isSubHi1 = (v) => {',
  '    const id = Array.isArray(v) && typeof v[1] === \'string\' ? v[1] : null;',
  '    const q = id ? BB[id] : null;',
  '    if (!q || q.opcode !== \'operator_subtract\') return false;',
  '    const j = JSON.stringify(q.inputs);',
  '    return j.indexOf(\'hi\') >= 0 && litOf(q.inputs.OPERAND2) === \'1\';',
  '  };'
].join('\n');
const to = [
  '  const nameOfArg = (v) => {',
  '    if (!Array.isArray(v)) return null;',
  '    if (v[0] === 12 && typeof v[1] === \'string\') return v[1];',
  '    const id = typeof v[1] === \'string\' ? v[1] : null;',
  '    const q = id ? BB[id] : null;',
  '    if (q && q.opcode === \'argument_reporter_string_number\' && q.fields.VALUE) return \'#\' + q.fields.VALUE[0];',
  '    if (q && q.opcode === \'data_variable\') return q.fields.VARIABLE[0];',
  '    if (Array.isArray(v[1])) return nameOfArg(v[1]);',
  '    return null;',
  '  };',
  '  const isSubHi1 = (v) => {',
  '    const id = Array.isArray(v) && typeof v[1] === \'string\' ? v[1] : null;',
  '    const q = id ? BB[id] : null;',
  '    if (!q || q.opcode !== \'operator_subtract\') return false;',
  '    return nameOfArg(q.inputs.OPERAND1) === \'#hi\' && litOf(q.inputs.OPERAND2) === \'1\';',
  '  };'
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p343.txt', s.replace(from, to));
console.log('isSubHi1 fixed');
