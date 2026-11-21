// 通用小工具：dump 某个过程里所有 control_repeat_until 的条件（含内联变量/文本/列表项名）
// 用法: node _work/v41/dbloops.cjs "assignlist %s"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const want = process.argv[2] || 'assignlist %s';
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
// 把任意 input 值渲染成 token 列表：内联变量 [12,name,id]、字面量 [10,"x"]/[4,"1"]、块 id
const render = (v, out) => {
  if (!Array.isArray(v)) return out;
  if (v[0] === 12 && typeof v[1] === 'string') { out.push('V:' + v[1]); return out; }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push('L:' + String(v[1])); return out; }
  if (typeof v[1] === 'string' && B[v[1]]) {
    const q = B[v[1]];
    if (q.opcode === 'data_variable') out.push('V:' + q.fields.VARIABLE[0]);
    else if (q.opcode === 'text') out.push('T:' + q.fields.TEXT[0]);
    else if (q.opcode === 'data_itemoflist') out.push('I:' + q.fields.LIST[0]);
    else out.push('(' + q.opcode + ')');
    for (const x of Object.values(q.inputs || {})) render(x, out);
    return out;
  }
  if (Array.isArray(v[1])) render(v[1], out);
  return out;
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_repeat_until') continue;
  if (want && owner(id) !== want) continue;
  n++;
  const t = render(b.inputs.CONDITION, []);
  console.log('#' + n + ' @' + id + ' cond = ' + t.join(' '));
}
console.log('total = ' + n + ' (proc=' + want + ')');
