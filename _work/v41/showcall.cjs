// print the inputs of a block by (owner proccode, snippet): crude but effective
// node _work/v41/showcall.cjs <project.json> "<proccode of the call>" "<owner proccode>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const wantCall = process.argv[3];
const wantOwner = process.argv[4];
const owners = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  const pc = q && q.mutation ? q.mutation.proccode : '?';
  const seen = new Set(); const st = [id];
  while (st.length) {
    const cur = st.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur); owners.set(cur, pc);
    const x = B[cur]; if (!x) continue;
    for (const v of Object.values(x.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (x.next) st.push(x.next);
  }
}
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const ARGS = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q) ARGS.set(q.mutation.proccode, Object.values(q.inputs || {}).map((v) => (B[v[1]] && B[v[1]].fields.VALUE ? B[v[1]].fields.VALUE[0] : '?')));
}
const R = (d) => {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return JSON.stringify(t);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (Array.isArray(d) && d[1] && d[1][0] === 13) return '@' + d[1][1];
  if (Array.isArray(d) && d[0] === 2) return '[' + R([3, d[1]]) + ']';
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return 'blk';
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len@' + (b.fields.LIST ? b.fields.LIST[0] : '?');
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'ARG:' + (b.fields.VALUE ? b.fields.VALUE[0] : '?');
      default: return b.opcode;
    }
  }
  return '?';
};
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== wantCall) continue;
  if (wantOwner && owners.get(id) !== wantOwner) continue;
  const names = ARGS.get(b.mutation.proccode) || [];
  const ids = JSON.parse(b.mutation.argumentids || '[]');
  console.log(id + ' ' + b.mutation.proccode + ' {' + ids.map((k, i) => (names[i] || '?') + '=' + R(b.inputs[k])).join(' ') + '}  owner=' + owners.get(id));
}
