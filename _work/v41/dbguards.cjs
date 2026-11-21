// 打印某些调用点外面那层 control_if/if_else 的条件（含内联变量、字面量、列表项）
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
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
const render = (v, out) => {
  if (!Array.isArray(v)) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(JSON.stringify(String(v[1]))); return out; }
  if (typeof v[1] === 'string' && B[v[1]]) {
    const q = B[v[1]];
    if (q.opcode === 'data_variable') out.push(q.fields.VARIABLE[0]);
    else if (q.opcode === 'text') out.push('T' + JSON.stringify(q.fields.TEXT[0]));
    else if (q.opcode === 'data_itemoflist') out.push(q.fields.LIST[0] + '[]');
    else if (q.opcode === 'argument_reporter_string_number') out.push('#' + q.fields.VALUE[0]);
    else if (q.opcode === 'operator_equals') out.push('=');
    else if (q.opcode === 'operator_and') out.push('AND');
    else if (q.opcode === 'operator_or') out.push('OR');
    else if (q.opcode === 'operator_not') out.push('NOT');
    else if (q.opcode === 'operator_contains') out.push('CONTAINS');
    else if (q.opcode === 'operator_gt') out.push('>');
    else if (q.opcode === 'operator_lt') out.push('<');
    else if (q.opcode === 'operator_add') out.push('+');
    else if (q.opcode === 'operator_subtract') out.push('-');
    for (const x of Object.values(q.inputs || {})) render(x, out);
    return out;
  }
  if (Array.isArray(v[1])) render(v[1], out);
  return out;
};
const want = process.argv[2];
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation) continue;
  if (b.mutation.proccode !== want) continue;
  let cur = id, g = null;
  for (let i = 0; i < 12 && cur; i++) {
    const q = B[cur];
    if (!q) break;
    if (q.opcode === 'control_if' || q.opcode === 'control_if_else') { g = q; break; }
    cur = q.parent;
  }
  const cond = g ? render(g.inputs.CONDITION, []).join(' ') : '(no enclosing if)';
  console.log(id + '  in ' + owner(id) + '  guard: ' + cond.slice(0, 200));
}
