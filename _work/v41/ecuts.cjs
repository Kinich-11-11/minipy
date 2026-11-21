// ecuts.cjs <project.json> : show every `set <var>` for a variable, with predecessor + guarding if
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const pc = process.argv[4];
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
function defIdOf(code) {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = B[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === code) return id;
    }
  }
  throw new Error('no def ' + code);
}
function reach(roots) {
  const seen = new Set(); const st = [roots];
  while (st.length) {
    const id = st.pop(); if (!id || seen.has(id)) continue;
    const b = B[id]; if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
  return seen;
}
const short = (d) => {
  if (d === undefined || d === null) return '?';
  const b = typeof d === 'string' ? B[d] : (typeof d[1] === 'string' ? B[d[1]] : null);
  if (Array.isArray(d) && (d[0] === 4 || d[0] === 10)) return JSON.stringify(d[1]);
  if (Array.isArray(d) && d[0] === 12) return '$' + d[1];
  if (!b) return JSON.stringify(d).slice(0, 30);
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + short(b.inputs.INDEX) + ']';
  if (b.opcode === 'procedures_call') return 'CALL ' + b.mutation.proccode.replace(/%s/g, '~');
  if (b.opcode === 'operator_gt') return '(' + short(b.inputs.OPERAND1) + '>' + short(b.inputs.OPERAND2) + ')';
  if (b.opcode === 'operator_and') return '(' + short(b.inputs.OPERAND1) + ' AND ' + short(b.inputs.OPERAND2) + ')';
  if (b.opcode === 'operator_not') return 'NOT' + short(b.inputs.OPERAND);
  if (b.opcode === 'operator_equals') return '(' + short(b.inputs.OPERAND1) + '==' + short(b.inputs.OPERAND2) + ')';
  if (b.opcode === 'operator_or') return '(' + short(b.inputs.OPERAND1) + ' OR ' + short(b.inputs.OPERAND2) + ')';
  return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.entries(b.inputs || {}).map(([k, v]) => short(v)).join(',') + ')';
};
const inside = reach(defIdOf(pc));
for (const id of inside) {
  const b = B[id];
  if ((b.opcode === 'data_setvariableto' || b.opcode === 'data_changevariableby')
    && b.fields.VARIABLE && b.fields.VARIABLE[0] === want) {
    console.log('set ' + want + ' = ' + short(b.inputs.VALUE) + '   @' + id);
    const pred = Object.keys(B).find((k) => B[k].next === id);
    if (pred) console.log('   pred: ' + B[pred].opcode + ' ' + JSON.stringify(B[pred].fields || {}) + ' = ' + short(B[pred].inputs.VALUE));
    let cur = id, g = 0;
    while (cur && g++ < 20) {
      const par = B[cur].parent;
      if (!par) break;
      const pb = B[par];
      if (pb.opcode === 'control_if' || pb.opcode === 'control_if_else') {
        console.log('   guard: ' + short(pb.inputs.CONDITION) + '  @' + par);
        break;
      }
      cur = par;
    }
  }
}
