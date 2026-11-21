const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const BL = () => T.blocks;
const litOf = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const blk = (d) => (d && typeof d[1] === 'string') ? BL()[d[1]] : null;
const varName = (d) => (Array.isArray(d) && Array.isArray(d[1]) && d[1][0] === 12) ? d[1][1] : null;
const isVarEq = (d, name, lit) => { const b = blk(d); return !!b && b.opcode === 'operator_equals' && ((varName(b.inputs.OPERAND1) === name && litOf(b.inputs.OPERAND2) === lit) || (varName(b.inputs.OPERAND2) === name && litOf(b.inputs.OPERAND1) === lit)); };
function defIdOf(pc) {
  for (const id of Object.keys(BL())) {
    const b = BL()[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = BL()[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
function reach(roots) {
  const seen = new Set();
  const stack = (Array.isArray(roots) ? roots : [roots]).slice();
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const b = BL()[id];
    if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') stack.push(v[1]); }
    if (b.next) stack.push(b.next);
  }
  return seen;
}
const rs = reach(defIdOf('rightside %s %s %s %s %s'));
const hits = [];
for (const id of rs) {
  const b = BL()[id];
  if (b.opcode === 'control_if' && b.inputs.CONDITION && isVarEq(b.inputs.CONDITION, 'evtype', 'L')) hits.push(id);
}
console.log('hits=' + hits.length + ' ' + hits.join(','));
const any = [...rs].filter((id) => BL()[id].opcode === 'control_if' && BL()[id].inputs.CONDITION && blk(BL()[id].inputs.CONDITION)
  && blk(BL()[id].inputs.CONDITION).opcode === 'operator_equals');
console.log('plain equals control_ifs=' + any.length);
for (const id of any.slice(0, 20)) {
  const e = blk(BL()[id].inputs.CONDITION);
  console.log('  ' + id + ' v1=' + varName(e.inputs.OPERAND1) + ' l1=' + litOf(e.inputs.OPERAND1) + ' v2=' + varName(e.inputs.OPERAND2) + ' l2=' + litOf(e.inputs.OPERAND2));
}

