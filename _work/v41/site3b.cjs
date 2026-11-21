const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const nameOf = (d) => {
  if (!Array.isArray(d)) return null;
  if (d[0] === 12) return d[1];
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return nameOf(d[1]);
  const id = typeof d === 'string' ? d : (typeof d[1] === 'string' ? d[1] : null);
  const b = id ? B[id] : null;
  if (!b) return null;
  if (b.opcode === 'data_variable') return b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return b.fields.VALUE[0];
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
const id = 'bcontro_14rejmh0g';
const b = B[id];
console.log('opcode=' + b.opcode);
console.log('hasOpenBracket = ' + deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === '[', 0));
console.log('hasCloseBracket= ' + deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && litOf(x.inputs.OPERAND2) === ']', 0));
console.log('loOnLeft       = ' + deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && nameOf(x.inputs.OPERAND1) === 'lo', 0));
console.log('substackHead   = ' + (b.inputs.SUBSTACK ? B[b.inputs.SUBSTACK[1]].opcode : 'none'));
console.log('hasListlit     = ' + (b.inputs.SUBSTACK ? deepHas(b.inputs.SUBSTACK[1], (x) => x.opcode === 'procedures_call' && x.mutation.proccode === 'listlit %s %s', 0) : 'n/a'));
// 顺便看看 CONDITION 里 equals 的 OPERAND1 到底是什么
const found = [];
const walk = (bid, d) => {
  if (!bid || d > 10 || typeof bid !== 'string') return;
  const x = B[bid];
  if (!x) return;
  if (x.opcode === 'operator_equals') found.push(JSON.stringify(x.inputs.OPERAND1).slice(0, 90) + ' == ' + JSON.stringify(x.inputs.OPERAND2).slice(0, 30));
  for (const v of Object.values(x.inputs || {})) if (v && typeof v[1] === 'string') walk(v[1], d + 1);
};
walk(b.inputs.CONDITION[1], 0);
console.log('equals in condition:'); found.forEach((f) => console.log('  ' + f));
