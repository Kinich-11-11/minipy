const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/_p269proj.json', 'utf8'));
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
// 找 strval 里 `ev = vv` 那条语句，看它后面跟了什么
let found = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'data_setvariableto' || b.fields.VARIABLE[0] !== 'ev') continue;
  if (owner(id) !== 'strval _ _') continue;
  found++;
  console.log('--- ev= site ' + found + ' id=' + id + ' valueLit=' + litOf(b.inputs.VALUE));
  let cur = b.next;
  for (let i = 0; i < 4 && cur; i++, cur = B[cur].next) {
    const x = B[cur];
    console.log('    next[' + i + '] ' + x.opcode + ' ' + (x.mutation ? x.mutation.proccode : JSON.stringify(x.fields || {}).slice(0, 40)) + (x.inputs && x.inputs.CONDITION ? ' cond=' + JSON.stringify(x.inputs.CONDITION).slice(0, 60) : ''));
    if (x.opcode === 'control_if' && x.inputs.SUBSTACK) {
      let s = x.inputs.SUBSTACK[1];
      for (let k = 0; k < 3 && s; k++, s = B[s].next) {
        console.log('         body[' + k + '] ' + B[s].opcode + ' ' + (B[s].mutation ? B[s].mutation.proccode : ''));
      }
    }
  }
}
console.log('total ev= sites in strval = ' + found);
