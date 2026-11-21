// 复现 PZ96 的编号顺序，打印 EV<k> 对应的调用点、宿主过程与守卫
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
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
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const render = (v, out, d) => {
  if (!Array.isArray(v) || d > 14) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(JSON.stringify(String(v[1]))); return out; }
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    if (q.opcode === 'data_variable') out.push(q.fields.VARIABLE[0]);
    else if (q.opcode === 'argument_reporter_string_number') out.push('#' + q.fields.VALUE[0]);
    else if (q.opcode === 'operator_add') out.push('ADD');
    else if (q.opcode === 'operator_subtract') out.push('SUB');
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
  const ow = ownerOf(id);
  if (ow === 'eval %s %s') continue;
  if (!/atom|callfn|calluser|cdo|methodcall|indexget|listlit|builtin/.test(ow)) continue;
  k++;
  if (k < 44 || k > 50) continue;
  const args = Object.values(b.inputs || {}).map((v) => render(v, [], 0).join(' '));
  let cur = id, g = null;
  for (let i = 0; i < 12 && cur; i++) {
    const q = BB[cur];
    if (!q) break;
    if (q.opcode === 'control_if' || q.opcode === 'control_if_else') { g = q; break; }
    cur = q.parent;
  }
  console.log('EV' + k + ' @' + id + '  in [' + ow + ']  args=' + JSON.stringify(args));
  if (g) console.log('     guard: ' + render(g.inputs.CONDITION, [], 0).join(' ').slice(0, 170));
}
