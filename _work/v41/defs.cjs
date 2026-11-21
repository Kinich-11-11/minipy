// list all procedures_definition blocks for a proccode with their body head:
// node _work/v41/defs.cjs <project.json> <proccode>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (!q || !q.mutation || q.mutation.proccode !== want) continue;
  const first = b.next;
  console.log('DEF ' + id + '  first=' + first + (first && B[first] ? '  ' + B[first].opcode : '') + '  paramNames=' + JSON.stringify(Object.values(q.inputs || {}).map((v) => (B[v[1]] && B[v[1]].fields.VALUE ? B[v[1]].fields.VALUE[0] : '?'))));
  // walk the chain and count statements
  let cur = first, n = 0;
  const tops = [];
  while (cur && n++ < 500) { tops.push(cur); cur = B[cur].next; }
  console.log('   chain length=' + n);
}
