// loose audit: control_if whose condition compares against '(' / '[' etc.
// node _work/v41/auditscan2.cjs <project.json>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const owner = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition') continue;
  const proto = B[b.inputs.custom_block[1]];
  const pc = proto && proto.mutation ? proto.mutation.proccode : '?';
  const seen = new Set(); const st = [id];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur); owner.set(cur, pc);
    const q = B[cur]; if (!q) continue;
    for (const v of Object.values(q.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (q.next) st.push(q.next);
  }
}
const litOf = (d) => (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') ? String(d[1])
  : (d && Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4) ? String(d[1][1]) : null);
const collect = (d, out = [], seen = new Set()) => {
  if (!d) return out;
  const id = typeof d === 'string' ? d : (Array.isArray(d) && typeof d[1] === 'string' ? d[1] : null);
  if (!id || seen.has(id)) return out;
  seen.add(id);
  const b = B[id];
  if (!b) return out;
  if (b.opcode === 'operator_equals') {
    const a = litOf(b.inputs.OPERAND1), c = litOf(b.inputs.OPERAND2);
    const other = a !== null ? b.inputs.OPERAND2 : b.inputs.OPERAND1;
    out.push({ ch: a !== null ? a : c, x: JSON.stringify(other) });
    return out;
  }
  for (const v of Object.values(b.inputs || {})) collect(v, out, seen);
  return out;
};
const stmts = (b, key) => {
  const s = b.inputs && b.inputs[key];
  if (!s || typeof s[1] !== 'string') return null;
  const out = [];
  let cur = s[1], g = 0;
  while (cur && g++ < 20) { const q = B[cur]; out.push(q.opcode + ' ' + JSON.stringify(q.fields || {}) + ' ' + JSON.stringify(q.inputs || {}).slice(0, 80)); cur = q.next; }
  return out;
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if') continue;
  const chars = collect(b.inputs.CONDITION);
  if (!chars.length) continue;
  const set = new Set(chars.map((c) => c.ch));
  if (![...set].every((c) => '([)]'.includes(c))) continue;
  if (![...set].some((c) => c === '(' || c === '[')) continue;
  n++;
  console.log('--- ' + (owner.get(id) || '?') + '  cond=' + JSON.stringify(b.inputs.CONDITION).slice(0, 40) + ' chars=' + [...set].join('') + ' xs=' + new Set(chars.map((c) => c.x)).size);
  const s = stmts(b, 'SUBSTACK');
  console.log('    sub: ' + (s ? s.join(' | ') : 'none'));
}
console.log('total candidates = ' + n);
