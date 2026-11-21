const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
const owner = (id) => {
  let cur = id;
  for (let g = 0; g < 3000 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
// 找 "AttributeError: 'str' object has no attribute '" 文本
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'operator_join') continue;
  const l = litOf(b.inputs.STRING1);
  if (!l || l.indexOf("AttributeError: 'str' object has no attribute") !== 0) continue;
  n++;
  console.log('--- str-attr join ' + n + ' id=' + id + ' owner=' + owner(id) + ' text=' + JSON.stringify(l));
  // 沿 parent 走到最近的 control_if / stopthis
  let cur = id, lvl = 0;
  for (let g = 0; g < 60 && cur; g++) {
    const par = B[cur].parent;
    if (!par) break;
    const pb = B[par];
    if (['control_if', 'control_if_else', 'control_stop', 'procedures_call'].includes(pb.opcode)) {
      lvl++;
      console.log('    up' + lvl + ': ' + pb.opcode + ' ' + (pb.mutation ? pb.mutation.proccode : '') + ' cond=' + (pb.inputs && pb.inputs.CONDITION ? JSON.stringify(pb.inputs.CONDITION).slice(0, 60) : '-'));
      if (lvl >= 4) break;
    }
    cur = par;
  }
}
console.log('total str-attr joins = ' + n);
