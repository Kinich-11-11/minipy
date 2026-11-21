// why did P50 miss an OR?  node _work/v41/why50.cjs <project.json> <controlBlockId>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const BL = T.blocks;
const start = process.argv[3];
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const blkOf = (d) => (!d || typeof d[1] !== 'string') ? null : (BL[d[1]] || null);
const eqChars = (desc) => {
  const b = blkOf(desc);
  if (!b || b.opcode !== 'operator_equals') return null;
  const o1 = b.inputs.OPERAND1, o2 = b.inputs.OPERAND2;
  const c2 = chOf(o2);
  if (c2 !== null) return { x: o1, ch: c2, id: desc[1] };
  const c1 = chOf(o1);
  if (c1 !== null) return { x: o2, ch: c1, id: desc[1] };
  return null;
};
const cond = BL[start].inputs.CONDITION;
console.log('CONDITION desc =', JSON.stringify(cond).slice(0, 120));
const cb = blkOf(cond);
console.log('cond block =', cb && cb.opcode, JSON.stringify((cb && cb.inputs) || {}).slice(0, 400));
if (cb && cb.opcode === 'operator_or') {
  const ea = eqChars(cb.inputs.OPERAND1), eb = eqChars(cb.inputs.OPERAND2);
  console.log('ea=', JSON.stringify(ea), 'eb=', JSON.stringify(eb));
  if (ea) {
    const x = ea.x;
    console.log('ea.x usable? typeof x=' + typeof x + ' x[1]=' + JSON.stringify(x && x[1]) + ' Array.isArray(x[1])=' + Array.isArray(x && x[1]) + ' blk=' + (typeof (x && x[1]) === 'string' ? !!BL[x[1]] : 'n/a'));
  }
}
