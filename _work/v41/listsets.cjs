// list every `set <var> = Kind[...]` / `Tok[...]` assignment inside a proc
// node _work/v41/listsets.cjs <project.json> "<proccode>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const R = (d) => {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return JSON.stringify(t);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const b = B[typeof d === 'string' ? d : d[1]];
    if (!b) return '?';
    if (b.opcode === 'data_itemoflist') return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + R(b.inputs.INDEX) + ']';
    if (b.opcode === 'argument_reporter_string_number') return 'ARG:' + b.fields.VALUE[0];
    if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
    if (b.opcode === 'operator_add') return '(' + R(b.inputs.NUM1) + '+' + R(b.inputs.NUM2) + ')';
    return b.opcode;
  }
  return '?';
};
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
const all = new Set();
const st = [B[def].next];
while (st.length) {
  const cur = st.pop();
  if (!cur || all.has(cur)) continue;
  all.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'data_setvariableto') {
    const v = b.inputs.VALUE;
    const q = (v && typeof v[1] === 'string') ? B[v[1]] : null;
    if (q && (q.opcode === 'data_itemoflist' || q.opcode === 'data_lengthoflist')) {
      console.log(b.fields.VARIABLE[0] + ' = ' + R(v));
    }
  }
  for (const x of Object.values(b.inputs || {})) if (x && typeof x[1] === 'string') st.push(x[1]);
  if (b.next) st.push(b.next);
}
