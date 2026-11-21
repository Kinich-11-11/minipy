const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
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
  if (!bid || d > 10) return '?';
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
  if (b.opcode === 'data_lengthoflist') return 'len(' + b.fields.LIST[0] + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
// 复刻 PZ37 的匹配顺序（reach 的顺序）——用 allIds 顺序近似也要一致，所以这里直接复刻 reach 的逻辑不易；
// 改为：把所有 paren/bracket 门控按 id 排序打印全部，供人工核对第 25 个。
const ids = Object.keys(B).filter((id) => {
  const b = B[id];
  if (b.opcode !== 'control_if' && b.opcode !== 'control_if_else') return false;
  if (!b.inputs.CONDITION) return false;
  return deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_equals' && ['(', '[', '{'].includes(litOf(x.inputs.OPERAND2)), 0);
});
console.log('total gates (allIds order) = ' + ids.length);
ids.forEach((id, i) => {
  const b = B[id];
  const sub1 = b.inputs.SUBSTACK ? show(b.inputs.SUBSTACK[1], 0).slice(0, 55) : '(none)';
  console.log((i + 1) + ') ' + id + '  cond=' + show(b.inputs.CONDITION[1], 0).slice(0, 120) + '  sub1=' + sub1);
});
