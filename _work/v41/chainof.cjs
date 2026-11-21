// node chainof.cjs <project.json> "<proccode>" [maxDepth] : print the statement chain of a procedure
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const maxDepth = Number(process.argv[4] || 2);
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
if (!def) throw new Error('no def');
const brief = (id) => {
  const b = B[id];
  if (!b) return id + ' MISSING';
  let s = b.opcode.replace(/^(data_|operator_|control_|procedures_)/, '') || b.opcode;
  if (b.fields) {
    for (const k of ['VARIABLE', 'LIST', 'STOP_OPTION']) if (b.fields[k]) s += ' ' + b.fields[k][0];
  }
  if (b.mutation && b.mutation.proccode) s += ' "' + b.mutation.proccode + '"';
  if (b.inputs && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string') {
    s += ' IF[' + condText(b.inputs.CONDITION[1]) + ']';
  }
  return id + ' ' + s;
};
const condText = (id, d = 0) => {
  if (d > 4) return '...';
  const b = B[id];
  if (!b) return '?';
  if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];
  if (b.opcode === 'argument_reporter_string_number') return 'ARG:' + b.fields.VALUE[0];
  if (b.opcode === 'data_itemoflist') return (b.fields && b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + (b.inputs.INDEX && typeof b.inputs.INDEX[1] === 'string' ? condText(b.inputs.INDEX[1], d + 1) : JSON.stringify(b.inputs.INDEX && b.inputs.INDEX[1])) + ']';
  const parts = [];
  for (const [k, v] of Object.entries(b.inputs || {})) {
    parts.push(typeof v[1] === 'string' ? condText(v[1], d + 1) : JSON.stringify(v[1]));
  }
  if (!parts.length && b.fields && b.fields.VALUE) return JSON.stringify(b.fields.VALUE[0]);
  return b.opcode.replace(/^operator_/, '') + '(' + parts.join(',') + ')';
};
const walk = (id, depth, tag) => {
  let cur = id, n = 0;
  while (cur && n++ < 400) {
    const b = B[cur];
    if (!b) { console.log('  '.repeat(depth) + cur + ' MISSING'); break; }
    const marks = [];
    if (b.opcode === 'control_stop') marks.push('STOP');
    if (b.fields && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'lmeth') marks.push('LMETH');
    if (b.opcode === 'procedures_call' && b.mutation && /fail/.test(b.mutation.proccode)
      && JSON.stringify(b.inputs || {}).includes('only lists have methods')) marks.push('LISTFAIL');
    if (b.opcode === 'procedures_call' && b.mutation && /callmeth/.test(b.mutation.proccode)) marks.push('CALLMETH');
    console.log('  '.repeat(depth) + (marks.length ? '** ' : '') + brief(cur) + (marks.length ? '  <<< ' + marks.join(',') : ''));
    if (depth < maxDepth) {
      for (const [k, v] of Object.entries(b.inputs || {})) {
        if (!k.startsWith('SUBSTACK')) continue;
        if (v && typeof v[1] === 'string') { console.log('  '.repeat(depth + 1) + '[' + k + ']'); walk(v[1], depth + 2, tag); }
      }
    }
    cur = b.next;
  }
};
walk(B[def].next, 0, '');
