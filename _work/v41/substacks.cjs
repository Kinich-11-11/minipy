// show both substacks of the eval control_if_else whose condition is <var> == <lit>
// node _work/v41/substacks.cjs <project.json> <proccode> <varName> <lit>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const [want, varName, lit] = [process.argv[3], process.argv[4], process.argv[5]];
const ARGS = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q) ARGS.set(q.mutation.proccode, Object.values(q.inputs || {}).map((v) => (B[v[1]] && B[v[1]].fields.VALUE ? B[v[1]].fields.VALUE[0] : '?')));
}
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
const varOf = (d) => (Array.isArray(d && d[1]) && d[1][0] === 12) ? d[1][1] : ((d && typeof d[1] === 'string' && B[d[1]] && B[d[1]].opcode === 'data_variable') ? B[d[1]].fields.VARIABLE[0] : null);
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
const all = new Set(); const st = [B[def].next];
while (st.length) {
  const cur = st.pop(); if (!cur || all.has(cur)) continue; all.add(cur);
  const b = B[cur]; if (!b) continue;
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
  if (b.next) st.push(b.next);
}
const brief = (id, ind) => {
  let cur = id, n = 0;
  while (cur && n++ < 40) {
    const b = B[cur]; if (!b) break;
    const call = (b.opcode === 'procedures_call' && b.mutation) ? ' CALL ' + b.mutation.proccode : '';
    const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
    let args = '';
    if (b.opcode === 'procedures_call' && b.mutation) {
      const names = ARGS.get(b.mutation.proccode) || [];
      const ids = JSON.parse(b.mutation.argumentids || '[]');
      args = ' {' + ids.map((k, i) => (names[i] || '?') + '=' + JSON.stringify(chOf(b.inputs[k]) !== null ? chOf(b.inputs[k]) : (Array.isArray(b.inputs[k]) && b.inputs[k][1] && b.inputs[k][1][0] === 12 ? '$' + b.inputs[k][1][1] : 'expr'))).join(' ') + '}';
    }
    console.log(ind + cur + ' ' + b.opcode + (f ? ' {' + f + '}' : '') + call + args);
    cur = b.next;
  }
};
for (const id of all) {
  const b = B[id];
  if (b.opcode !== 'control_if_else' || !b.inputs.CONDITION) continue;
  const cb = B[b.inputs.CONDITION[1]];
  if (!cb || cb.opcode !== 'operator_equals') continue;
  const a = cb.inputs.OPERAND1, c = cb.inputs.OPERAND2;
  const okv = (varOf(a) === varName && chOf(c) === lit) || (varOf(c) === varName && chOf(a) === lit);
  if (!okv) continue;
  console.log('=== ' + id + ' IF (' + varName + ' == ' + lit + ')');
  for (const k of ['SUBSTACK', 'SUBSTACK2']) {
    const s = b.inputs[k];
    console.log(' --' + k + '-- ' + (s && typeof s[1] === 'string' ? '' : 'EMPTY'));
    if (s && typeof s[1] === 'string') brief(s[1], '   ');
  }
}
