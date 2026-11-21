const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/_p258proj.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'rank %s') continue;
  n++;
  console.log('rank call ' + n + ' id=' + id + ' next=' + (b.next || 'null'));
  let cur = b.next;
  for (let i = 0; i < 3 && cur; i++, cur = B[cur].next) {
    const x = B[cur];
    console.log('   next[' + i + '] ' + x.opcode + ' ' + JSON.stringify(x.fields || {}).slice(0, 60) + ' cond=' + (x.inputs && x.inputs.CONDITION ? JSON.stringify(x.inputs.CONDITION).slice(0, 80) : '-'));
  }
}
console.log('total rank calls = ' + n);
