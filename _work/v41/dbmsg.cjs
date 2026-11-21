// 列出解释器里所有包含某子串的 text 字面量，以及它们所在的过程
// 用法: node _work/v41/dbmsg.cjs "parenthes"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const want = process.argv[2] || '';
const owner = (id) => {
  let c = id;
  for (let i = 0; i < 400 && c; i++) {
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
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'text' || !b.fields || !b.fields.TEXT) continue;
  const t = String(b.fields.TEXT[0]);
  if (t.indexOf(want) < 0) continue;
  n++;
  console.log('#' + n + ' @' + id + '  in [' + owner(id) + ']  text=' + JSON.stringify(t));
}
console.log('total = ' + n + ' (substring ' + JSON.stringify(want) + ')');
