// final audit: brace-blind DEPTH SCANS to wrap
// node _work/v41/auditscan3.cjs <project.json> [--apply-report]
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
    out.push({ ch: a !== null ? a : c, x: JSON.stringify(other), id });
    return out;
  }
  for (const v of Object.values(b.inputs || {})) collect(v, out, seen);
  return out;
};
const deltaOf = (b) => {
  const v = b.inputs && b.inputs.VALUE;
  if (!v) return null;
  const raw = (Array.isArray(v) && v[0] === 1 && Array.isArray(v[1])) ? v[1] : v;
  if (Array.isArray(raw) && (raw[0] === 4 || raw[0] === 10) && typeof raw[1] === 'string') return Number(raw[1]);
  return null;
};
// canonical form of a descriptor: block ids replaced by a per-walk sequence number,
// so two structurally identical expressions compare equal even when their blocks differ
const canon = (d, map = new Map()) => {
  if (d === null || d === undefined) return 'null';
  if (Array.isArray(d)) {
    if (typeof d[1] === 'string' && d.length <= 3) {
      const id = d[1];
      if (!map.has(id)) map.set(id, '#' + map.size);
      const b = B[id];
      const body = b ? canonBlock(b, map) : '?';
      return '[' + d[0] + ' ' + map.get(id) + ' ' + body + (d.length > 2 ? ' ' + canon(d[2], map) : '') + ']';
    }
    return '(' + d.map((e) => canon(e, map)).join(',') + ')';
  }
  return JSON.stringify(d);
};
const canonBlock = (b, map) => {
  const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
  const i = Object.entries(b.inputs || {}).sort(([a], [c]) => a < c ? -1 : 1).map(([k, v]) => k + '=' + canon(v, map)).join(',');
  return b.opcode + '{' + f + '|' + i + '}';
};
const byProc = new Map();
let total = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if') continue;
  const chars = collect(b.inputs.CONDITION);
  if (!chars.length || chars.some((c) => c.ch === null || c.ch === undefined)) continue;
  const set = [...new Set(chars.map((c) => c.ch))];
  const opens = set.every((c) => c === '(' || c === '[');
  const closes = set.every((c) => c === ')' || c === ']');
  if (!opens && !closes) continue;
  const xs = new Set(chars.map((c) => canon(JSON.parse(c.x))));
  if (xs.size !== 1) continue;
  const s = b.inputs.SUBSTACK;
  if (!s || typeof s[1] !== 'string') continue;
  const first = B[s[1]];
  if (first.opcode !== 'data_changevariableby') continue;
  if (first.next) continue;
  const d = deltaOf(first);
  if (d !== (closes ? -1 : 1)) continue;
  total++;
  const pc = owner.get(id) || '?';
  byProc.set(pc, (byProc.get(pc) || 0) + 1);
  console.log('OK  ' + pc.padEnd(24) + ' chars=' + set.join('') + '  var=' + first.fields.VARIABLE[0] + '  x=' + [...xs][0].slice(0, 70));
}
console.log('--- wrap candidates: ' + total);
for (const [pc, n] of byProc) console.log('    ' + String(n).padStart(2) + '  ' + pc);
