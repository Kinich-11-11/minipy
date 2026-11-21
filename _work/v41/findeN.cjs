// 复现 PZ100 的编号顺序（按 Object.keys 顺序数所有 `eval %s %s` 调用点），打印第 N 个
// 用法: node _work/v41/findeN.cjs 129
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const wantN = Number(process.argv[2] || 129);
const ownerOf = (id) => {
  let cur = id;
  for (let i = 0; i < 400 && cur; i++) {
    const q = BB[cur];
    if (!q) return '?';
    if (q.opcode === 'procedures_definition') {
      const pr = BB[q.inputs.custom_block[1]];
      return pr && pr.mutation ? String(pr.mutation.proccode) : '?';
    }
    cur = q.parent;
  }
  return '(toplevel)';
};
const render = (v, out, d) => {
  if (!Array.isArray(v) || d > 14) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(JSON.stringify(String(v[1]))); return out; }
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    if (q.opcode === 'data_variable') out.push(q.fields.VARIABLE[0]);
    else if (q.opcode === 'argument_reporter_string_number') out.push('#' + q.fields.VALUE[0]);
    else if (q.opcode === 'data_itemoflist') out.push(q.fields.LIST[0] + '[..]');
    else if (q.opcode === 'operator_add') out.push('ADD');
    else if (q.opcode === 'operator_subtract') out.push('SUB');
    else if (q.opcode === 'operator_equals') out.push('EQ');
    else if (q.opcode === 'operator_gt') out.push('GT');
    else if (q.opcode === 'operator_and') out.push('AND');
    else out.push('(' + q.opcode.replace(/^(operator_|data_|control_)/, '') + ')');
    for (const x of Object.values(q.inputs || {})) render(x, out, d + 1);
    return out;
  }
  if (Array.isArray(v[1])) render(v[1], out, d + 1);
  return out;
};
let k = 0;
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_call' || !b.mutation) continue;
  if (String(b.mutation.proccode) !== 'eval %s %s') continue;
  k++;
  if (k !== wantN) continue;
  const args = Object.values(b.inputs || {}).map((v) => render(v, [], 0).join(' '));
  console.log('E' + k + ' @' + id + ' in [' + ownerOf(id) + ']  args=' + JSON.stringify(args));
  let cur = id, depth = 0;
  for (let i = 0; i < 16 && cur; i++) {
    const q = BB[cur];
    if (!q) break;
    if (q.opcode === 'control_if' || q.opcode === 'control_if_else' || q.opcode === 'control_repeat_until') {
      console.log('    enclosing ' + q.opcode + ' @' + cur + ' cond: ' + render(q.inputs.CONDITION, [], 0).join(' ').slice(0, 180));
      if (++depth >= 3) break;
    }
    cur = q.parent;
  }
}
console.log('total eval sites = ' + k);
