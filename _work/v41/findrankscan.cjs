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
const show = (bid, d) => {
  if (!bid || d > 11) return '?';
  const b = B[bid];
  if (!b) return JSON.stringify(bid);
  if (b.opcode === 'procedures_call') return b.mutation.proccode.replace(/%s/g, '_');
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + show(b.inputs.INDEX[1], d + 1) + ']';
  if (b.opcode === 'operator_add') return '(' + show(b.inputs.NUM1[1], d + 1) + '+' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_subtract') return '(' + show(b.inputs.NUM1[1], d + 1) + '-' + show(b.inputs.NUM2[1], d + 1) + ')';
  if (b.opcode === 'operator_equals') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '==' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_and') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' AND ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_or') return '(' + show(b.inputs.OPERAND1[1], d + 1) + ' OR ' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_not') return 'NOT ' + show(b.inputs.OPERAND[1], d + 1);
  if (b.opcode === 'operator_gt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '>' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  if (b.opcode === 'operator_lt') return '(' + show(b.inputs.OPERAND1[1], d + 1) + '<' + show(b.inputs.OPERAND2[1], d + 1) + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => show(v[1], d + 1)).join(',') + ')';
};
function allIds() { return Object.keys(B); }
function defIdOf(proccode) {
  for (const id of allIds()) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const proto = B[b.inputs.custom_block[1]];
      if (proto && proto.mutation && proto.mutation.proccode === proccode) return id;
    }
  }
  throw new Error('no def');
}
function reach(roots) {
  const seen = new Set();
  const stack = (Array.isArray(roots) ? roots : [roots]).slice();
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const b = B[id];
    if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') stack.push(v[1]); }
    if (b.next) stack.push(b.next);
  }
  return seen;
}
const deepHas = (id, pred, depth) => {
  if (!id || depth > 120 || typeof id !== 'string') return false;
  const b = B[id];
  if (!b) return false;
  if (pred(b)) return true;
  if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;
  return deepHas(b.next, pred, depth + 1);
};
const ev = reach(defIdOf('eval %s %s'));
const wantsEmin = (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'emin';
let n = 0;
for (const id of ev) {
  const b = B[id];
  if (b.opcode !== 'control_if_else' || !b.inputs.SUBSTACK2) continue;
  if (!deepHas(b.inputs.SUBSTACK2[1], wantsEmin, 0)) continue;
  n++;
  console.log('=== if_else ' + id);
  console.log('  COND: ' + show(b.inputs.CONDITION[1], 0));
  console.log('  SUB1 head: ' + (b.inputs.SUBSTACK ? show(b.inputs.SUBSTACK[1], 0).slice(0, 60) : '(none)'));
  console.log('  SUB2 head: ' + show(b.inputs.SUBSTACK2[1], 0).slice(0, 60));
}
console.log('total candidates = ' + n);
