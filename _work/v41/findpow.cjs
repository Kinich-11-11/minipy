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
  for (let g = 0; g < 4000 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  const j = JSON.stringify(b);
  if (!/pow/.test(j)) continue;
  if (b.opcode === 'text' || j.indexOf('pow()') >= 0 || j.indexOf('needs an integer') >= 0 || j.indexOf('"pow"') >= 0) {
    n++;
    console.log(n + ') ' + b.opcode + ' id=' + id + ' owner=' + owner(id) + ' :: ' + j.slice(0, 170));
  }
  if (n > 12) break;
}
console.log('total = ' + n);
