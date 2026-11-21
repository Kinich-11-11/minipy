// list all procedures with their parameter names: node _work/v41/listprocs.cjs <project.json> [zeroOnly]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const zero = process.argv[3] === 'zero';
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const proto = B[b.inputs.custom_block[1]];
  if (!proto) continue;
  const names = Object.values(proto.inputs || {}).map((v) => (B[v[1]] && B[v[1]].fields.VALUE ? B[v[1]].fields.VALUE[0] : '?'));
  if (zero && names.length) continue;
  console.log(id + '  ' + proto.mutation.proccode + '  (' + names.join(',') + ')');
}
