// 打印某块所在语句链的上下文（前后各 N 条）以及外层 IF 的条件
// 用法: node _work/v41/dbctx.cjs <blockId> [before] [after]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
let id = process.argv[2];
if (!B[id]) {
  const want = String(process.argv[2]);
  for (const k of Object.keys(B)) { if (JSON.stringify(B[k]).indexOf(want) >= 0) { id = k; break; } }
  console.log('resolved id = ' + id);
}
const before = Number(process.argv[3] || 4);
const after = Number(process.argv[4] || 5);
const render = (v, out, d) => {
  if (!Array.isArray(v) || d > 14) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(JSON.stringify(String(v[1]))); return out; }
  if (typeof v[1] === 'string' && B[v[1]]) {
    const q = B[v[1]];
    const map = {
      data_variable: () => q.fields.VARIABLE[0], text: () => 'T' + JSON.stringify(q.fields.TEXT[0]),
      data_itemoflist: () => q.fields.LIST[0] + '[]', data_lengthoflist: () => 'LEN:' + q.fields.LIST[0],
      argument_reporter_string_number: () => '#' + q.fields.VALUE[0],
      operator_equals: () => 'EQ', operator_and: () => 'AND', operator_or: () => 'OR', operator_not: () => 'NOT',
      operator_contains: () => 'CONTAINS', operator_gt: () => 'GT', operator_lt: () => 'LT',
      operator_add: () => 'ADD', operator_subtract: () => 'SUB', operator_join: () => 'JOIN',
      control_if: () => 'IF', control_if_else: () => 'IFELSE', control_repeat_until: () => 'LOOP'
    }[q.opcode];
    out.push(map ? map() : '(' + q.opcode + ')');
    for (const x of Object.values(q.inputs || {})) render(x, out, d + 1);
    return out;
  }
  if (Array.isArray(v[1])) render(v[1], out, d + 1);
  return out;
};
const desc = (bid) => {
  const q = B[bid];
  if (!q) return bid + ' (missing)';
  let s = q.opcode;
  if (q.mutation && q.mutation.proccode) s += ' [' + q.mutation.proccode + ']';
  if (q.inputs && q.inputs.OPERAND1 && q.opcode === 'procedures_call' && q.mutation && /fail %s/.test(q.mutation.proccode)) {
    s += ' msg=' + render(q.inputs.OPERAND1, [], 0).join(' ');
  }
  return s;
};
// 找链头：向上直到 parent 不是"以 cur 为 next 的语句"
let head = id;
for (let i = 0; i < 60; i++) {
  const par = B[head] && B[head].parent;
  if (par && B[par] && B[par].next === head) { head = par; continue; }
  break;
}
let cur = head, n = 0; const lines = [];
while (cur && B[cur] && n < 60) { lines.push((cur === id ? '>> ' : '   ') + n + ': ' + desc(cur) + '  @' + cur); cur = B[cur].next; n++; }
const at = lines.findIndex((l) => l.startsWith('>> '));
console.log(lines.slice(Math.max(0, at - before), at + after + 1).join('\n'));
// 外层 IF
let c2 = id, depth = 0;
for (let i = 0; i < 12 && c2; i++) {
  const q = B[c2];
  if (!q) break;
  if (q.opcode === 'control_if' || q.opcode === 'control_if_else' || q.opcode === 'control_repeat_until') {
    console.log('  enclosing ' + q.opcode + ' @' + c2 + ' cond: ' + render(q.inputs.CONDITION, [], 0).join(' ').slice(0, 170));
  }
  c2 = q.parent;
}
