const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
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
  if (j.indexOf('is not defined') < 0) continue;
  n++;
  console.log(n + ') ' + b.opcode + ' id=' + id + ' owner=' + owner(id) + ' :: ' + j.slice(0, 150));
}
console.log('total blocks mentioning "is not defined" = ' + n);
