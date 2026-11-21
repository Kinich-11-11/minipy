// temp: dump every raised limit as it sits in the built artifact (the ground truth)
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const owner = (id) => { let c = id, g = 0; while (c && g++ < 400) { const b = B[c]; if (!b) return '?'; if (b.opcode === 'procedures_definition') { const q = B[b.inputs.custom_block[1]]; return q && q.mutation ? q.mutation.proccode : '?'; } c = b.parent; } return 'top'; };
const ids = Object.keys(B);
const lit = (v) => (Array.isArray(v) && Array.isArray(v[1]) && typeof v[1][1] === 'string' ? v[1][1] : null);
for (const id of ids) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;
  const msg = Object.values(b.inputs || {}).map(lit).find((x) => x && /^(LimitError|RecursionError)/.test(x));
  if (!msg) continue;
  let c = id, g = 0, guard = null;
  while (c && g++ < 400) { const n = B[c]; if (!n) break; if (n.opcode === 'control_if' || n.opcode === 'control_if_else') { guard = n; break; } c = n.parent; }
  const cond = guard ? B[guard.inputs.CONDITION[1]] : null;
  const show = (x) => { const bb = B[x]; if (!bb) return String(x); return bb.opcode + '(' + Object.values(bb.inputs || {}).map((v) => lit(v) || (v && typeof v[1] === 'string' ? v[1] : '?')).join(', ') + ')'; };
  console.log(owner(id).padEnd(24) + ' ' + (cond ? show(cond.inputs.OPERAND1[1] || cond.inputs.OPERAND1) + ' > ' + show(cond.inputs.OPERAND2[1] || cond.inputs.OPERAND2) : 'no guard') + '   [' + msg + ']');
}
// the console trim has no message
for (const id of ids) {
  const b = B[id];
  if (b.opcode !== 'operator_gt') continue;
  const l = b.inputs && b.inputs.OPERAND1 && typeof b.inputs.OPERAND1[1] === 'string' ? B[b.inputs.OPERAND1[1]] : null;
  if (l && l.opcode === 'data_lengthoflist' && l.fields.LIST[0] === 'Output') console.log(owner(id).padEnd(24) + ' length of Output > ' + lit(b.inputs.OPERAND2) + '   [silent trim]');
}
