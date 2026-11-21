// for every call to <proccode>, print the enclosing control conditions (walking up via parent)
// node _work/v41/callctx.cjs <project.json> "<proccode>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const ARGS = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const proto = B[b.inputs.custom_block[1]];
  if (proto) ARGS.set(proto.mutation.proccode, Object.values(proto.inputs || {}).map((v) => (B[v[1]] && B[v[1]].fields.VALUE ? B[v[1]].fields.VALUE[0] : '?')));
}
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
function R(d) {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return JSON.stringify(t);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (Array.isArray(d) && d[0] === 2) return '[' + R([3, d[1]]) + ']';
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return 'blk';
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_equals': return '(' + ar('OPERAND1') + ' == ' + ar('OPERAND2') + ')';
      case 'operator_gt': return '(' + ar('OPERAND1') + ' > ' + ar('OPERAND2') + ')';
      case 'operator_lt': return '(' + ar('OPERAND1') + ' < ' + ar('OPERAND2') + ')';
      case 'operator_and': return '(' + ar('OPERAND1') + ' and ' + ar('OPERAND2') + ')';
      case 'operator_or': return '(' + ar('OPERAND1') + ' or ' + ar('OPERAND2') + ')';
      case 'operator_not': return '!' + ar('OPERAND');
      case 'operator_contains': return '(' + ar('STRING1') + ' in ' + ar('STRING2') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'ARG:' + (b.fields.VALUE ? b.fields.VALUE[0] : '?');
      default: return b.opcode;
    }
  }
  return '?';
}
let owner = null;
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
const want = process.argv[3];
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== want) continue;
  const names = ARGS.get(want) || [];
  const ids = JSON.parse(b.mutation.argumentids || '[]');
  console.log('CALL ' + want + ' {' + ids.map((k, i) => (names[i] || '?') + '=' + R(b.inputs[k])).join(' ') + '}  owner=' + owners.get(id));
  let cur = id, guard = 0;
  while (cur && guard++ < 30) {
    const par = B[cur] ? B[cur].parent : null;
    if (!par) break;
    const q = B[par];
    if (q.opcode === 'control_if' || q.opcode === 'control_if_else' || q.opcode === 'control_repeat_until' || q.opcode === 'control_repeat') {
      console.log('    in ' + q.opcode + ' IF ' + R(q.inputs.CONDITION));
    }
    cur = par;
  }
}
