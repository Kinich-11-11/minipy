const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const lit = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
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
const arg = (d) => { const b = (d && typeof d[1] === 'string') ? B[d[1]] : null; return b && b.opcode === 'argument_reporter_string_number' ? 'arg:' + b.fields.VALUE[0] : null; };
const vn = (d) => (Array.isArray(d) && Array.isArray(d[1]) && d[1][0] === 12) ? 'var:' + d[1][1] : null;
const short = (d) => {
  if (d === undefined || d === null) return '?';
  const b = (typeof d === 'string') ? B[d] : ((typeof d[1] === 'string') ? B[d[1]] : null);
  const l = lit(d);
  if (l !== null) return l;
  if (arg(d)) return arg(d);
  if (vn(d)) return vn(d);
  if (!b) return JSON.stringify(d).slice(0, 30);
  return b.opcode + '(' + Object.entries(b.inputs || {}).map(([k, v]) => short(v)).join(',') + ')';
};
const def = defIdOf(process.argv[3] || 'rightside %s %s %s %s %s');
const seen = new Set();
const stack = [B[def].next];
while (stack.length) {
  const cur = stack.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'operator_or' || b.opcode === 'operator_and' || b.opcode === 'operator_not') {
    console.log(cur, b.opcode, Object.entries(b.inputs).map(([k, v]) => k + '=' + short(v)).join(' | '));
  }
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
