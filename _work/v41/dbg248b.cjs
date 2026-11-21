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
const find = (set, pred) => { const out = []; for (const id of set) if (pred(B[id], id)) out.push(id); return out; };
const al = reach(defIdOf('assignlist %s'));
let c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0;
for (const id of al) {
  const b = B[id];
  if (b.opcode !== 'control_repeat_until') continue;
  c1++;
  if (!b.inputs.CONDITION) continue;
  c2++;
  if (!B[b.inputs.CONDITION[1]] || B[b.inputs.CONDITION[1]].opcode !== 'operator_gt') continue;
  c3++;
  if (nameOf(B[b.inputs.CONDITION[1]].inputs.OPERAND1) !== 'aui2') continue;
  c4++;
  if (!b.inputs.SUBSTACK) continue;
  c5++;
  const sub = find([b.inputs.SUBSTACK[1]], (x) => x.opcode === 'control_if' && x.inputs.CONDITION
    && B[x.inputs.CONDITION[1]] && B[x.inputs.CONDITION[1]].opcode === 'operator_contains'
    && litOf(B[x.inputs.CONDITION[1]].inputs.STRING1) === '([{');
  console.log('loop ' + id + ' substack head=' + b.inputs.SUBSTACK[1] + ' subMatches=' + sub.length);
  if (sub.length === 1) c6++;
}
console.log('clauses: loops=' + c1 + ' hasCond=' + c2 + ' gt=' + c3 + ' aui2=' + c4 + ' substack=' + c5 + ' subMatch=' + c6);
