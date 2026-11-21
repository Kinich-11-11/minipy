// node findmsg.cjs <project.json> "<message>" : count fail %s calls carrying that literal and print their owning procs
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const msg = process.argv[3];
const owner = (id) => {
  let cur = id, guard = 0;
  while (cur && guard++ < 300) {
    const b = B[cur];
    if (!b) return 'MISSING';
    if (b.opcode === 'procedures_definition') {
      const q = B[b.inputs.custom_block[1]];
      return q && q.mutation ? q.mutation.proccode : '?';
    }
    cur = b.parent;
  }
  return 'top';
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call') continue;
  const j = JSON.stringify(b.inputs || {});
  if (!j.includes(msg)) continue;
  n++;
  console.log(id + ' proc=' + (b.mutation ? b.mutation.proccode : '?') + ' in ' + owner(id) + ' inputs=' + j.slice(0, 160));
}
console.log('total = ' + n);
