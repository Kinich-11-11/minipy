// 列出某过程里所有 control_if / control_if_else 的条件，以及各自 SUBSTACK 里的过程调用
// 用法: node _work/v41/dbifs.cjs "execute"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const want = process.argv[2] || 'execute';
const owner = (id) => {
  let c = id;
  for (let i = 0; i < 200 && c; i++) {
    const q = B[c];
    if (!q) return '?';
    if (q.opcode === 'procedures_definition') {
      const pr = B[q.inputs.custom_block[1]];
      return pr && pr.mutation ? String(pr.mutation.proccode) : '?';
    }
    c = q.parent;
  }
  return '(toplevel)';
};
const render = (v, out, d) => {
  if (!Array.isArray(v) || d > 14) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(JSON.stringify(String(v[1]))); return out; }
  if (typeof v[1] === 'string' && B[v[1]]) {
    const q = B[v[1]];
    const short = {
      data_variable: () => q.fields.VARIABLE[0],
      text: () => 'T' + JSON.stringify(q.fields.TEXT[0]),
      data_itemoflist: () => q.fields.LIST[0] + '[]',
      argument_reporter_string_number: () => '#' + q.fields.VALUE[0],
      operator_equals: () => 'EQ', operator_and: () => 'AND', operator_or: () => 'OR',
      operator_not: () => 'NOT', operator_contains: () => 'CONTAINS',
      operator_gt: () => 'GT', operator_lt: () => 'LT', operator_add: () => 'ADD',
      operator_subtract: () => 'SUB', data_lengthoflist: () => 'LEN:' + q.fields.LIST[0],
      data_listcontainsitem: () => 'IN:' + q.fields.LIST[0]
    }[q.opcode];
    out.push(short ? short() : '(' + q.opcode.replace(/^operator_|^data_|^control_/, '') + ')');
    for (const x of Object.values(q.inputs || {})) render(x, out, d + 1);
    return out;
  }
  if (Array.isArray(v[1])) render(v[1], out, d + 1);
  return out;
};
const callsIn = (id, d, out) => {
  if (!id || d > 30 || typeof id !== 'string') return out;
  const q = B[id];
  if (!q) return out;
  if (q.opcode === 'procedures_call' && q.mutation) out.push(String(q.mutation.proccode));
  for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') callsIn(v[1], d + 1, out);
  callsIn(q.next, d + 1, out);
  return out;
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if' && b.opcode !== 'control_if_else') continue;
  if (want && owner(id) !== want) continue;
  n++;
  const cond = render(b.inputs.CONDITION, [], 0).join(' ').slice(0, 170);
  const sub = b.inputs.SUBSTACK ? callsIn(b.inputs.SUBSTACK[1], 0, []) : [];
  const sub2 = b.inputs.SUBSTACK2 ? callsIn(b.inputs.SUBSTACK2[1], 0, []) : [];
  console.log('#' + n + ' ' + b.opcode + ' @' + id);
  console.log('    cond: ' + cond);
  console.log('    then: ' + [...new Set(sub)].slice(0, 6).join(', '));
  if (sub2.length) console.log('    else: ' + [...new Set(sub2)].slice(0, 6).join(', '));
}
console.log('total = ' + n + ' in ' + want);
