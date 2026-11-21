// audit: candidate brace-blind DEPTH SCANS
//   condition = one or more char comparisons against '(' / '[' (or ')' / ']')
//   substack   = exactly one data_changevariableby with +1 (open) or -1 (close)
// node _work/v41/auditscan.cjs <project.json>
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
// walk a boolean condition tree, collect the char comparisons
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
const substackOps = (b, key) => {
  const s = b.inputs && b.inputs[key];
  if (!s || typeof s[1] !== 'string') return null;
  const out = [];
  let cur = s[1], g = 0;
  while (cur && g++ < 20) {
    const q = B[cur];
    out.push(q.opcode + (q.opcode === 'data_changevariableby' ? ' ' + q.fields.VARIABLE[0] + '=' + JSON.stringify((q.inputs.VALUE || [])[1]) : ''));
    cur = q.next;
  }
  return out;
};
const stats = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if') continue;
  const chars = collect(b.inputs.CONDITION);
  if (!chars.length) continue;
  const set = new Set(chars.map((c) => c.ch));
  const xs = new Set(chars.map((c) => c.x));
  const opens = [...set].every((c) => c === '(' || c === '[');
  const closes = [...set].every((c) => c === ')' || c === ']');
  if (!opens && !closes) continue;
  if (xs.size !== 1) continue;
  const ops = substackOps(b, 'SUBSTACK');
  if (!ops || ops.length !== 1) continue;
  if (!ops[0].startsWith('data_changevariableby')) continue;
  const delta = closes ? -1 : 1;
  if (ops[0] !== 'data_changevariableby ' + ops[0].split(' ')[1] + '=' + JSON.stringify(String(delta))) {
    // the rendered delta is the raw VALUE descriptor; accept "+1"/"-1"/1/-1 textually
    if (![`="${delta}"`, `=${delta}`].some((t) => ops[0].endsWith(t))) continue;
  }
  const pc = owner.get(id) || '?';
  const key = pc + '   [' + [...set].join('') + ']  x=' + [...xs][0].slice(0, 60);
  stats.set(key, (stats.get(key) || 0) + 1);
  console.log('OK  ' + key + '  sub=' + ops[0]);
}
console.log('--- candidates: ' + [...stats.values()].reduce((a, b2) => a + b2, 0) + ' in ' + stats.size + ' shapes');
