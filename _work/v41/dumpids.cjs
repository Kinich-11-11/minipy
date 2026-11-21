// node dumpids.cjs <project.json> "<proccode>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const proto = B[b.inputs.custom_block[1]];
  if (!proto || proto.mutation.proccode !== want) continue;
  console.log('DEF ' + id + ' proto ' + proto.mutation.argumentids + ' ' + proto.mutation.argumentnames + ' warp=' + proto.mutation.warp);
}
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call') continue;
  if (!b.mutation || b.mutation.proccode !== want) continue;
  console.log('CALL ' + id + ' ' + b.mutation.argumentids + ' warp=' + b.mutation.warp + ' inputs=' + JSON.stringify(Object.keys(b.inputs || {})));
}
