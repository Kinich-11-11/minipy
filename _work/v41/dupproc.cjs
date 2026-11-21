// node dupproc.cjs <project.json> [proccode]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const seen = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const proto = B[b.inputs.custom_block[1]];
  if (!proto) continue;
  const pc = proto.mutation.proccode;
  if (!seen.has(pc)) seen.set(pc, []);
  seen.get(pc).push({ id, argIds: proto.mutation.argumentids, argNames: proto.mutation.argumentnames });
}
if (process.argv[3]) {
  console.log(JSON.stringify(seen.get(process.argv[3]), null, 2));
} else {
  let d = 0;
  for (const [pc, list] of seen) if (list.length > 1) { d++; console.log(pc + ' x' + list.length + ' ' + JSON.stringify(list.map((x) => x.argIds))); }
  console.log('duplicate proccodes = ' + d + ' / total ' + seen.size);
}
