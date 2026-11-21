const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const lit = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const vn = (d) => (Array.isArray(d) && Array.isArray(d[1]) && d[1][0] === 12) ? d[1][1] : null;
function defIdOf(pc) {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = B[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
const def = defIdOf(process.argv[3]);
const seen = new Set();
const stack = [B[def].next];
let n = 0;
while (stack.length) {
  const cur = stack.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'control_if' || b.opcode === 'control_if_else') {
    const c = b.inputs.CONDITION;
    const cb = (c && typeof c[1] === 'string') ? B[c[1]] : null;
    if (cb && cb.opcode === 'operator_equals' && (vn(cb.inputs.OPERAND1) || vn(cb.inputs.OPERAND2))) {
      console.log('IF ' + cur + ' cond=' + cur + ' eq ' + vn(cb.inputs.OPERAND1) + ' / ' + vn(cb.inputs.OPERAND2) + ' lit=' + lit(cb.inputs.OPERAND1) + '/' + lit(cb.inputs.OPERAND2));
      n++;
    }
  }
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
console.log('total=' + n);
