// print the raw JSON of the first few statements of a procedure
// node _work/v41/rawproc.cjs <project.json> "<proccode>" [n]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const n = Number(process.argv[4] || 3);
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
if (!def) throw new Error('no def');
const proto = B[B[def].inputs.custom_block[1]];
console.log('proccode=' + proto.mutation.proccode);
console.log('argumentnames=' + proto.mutation.argumentnames);
console.log('argumentids=' + proto.mutation.argumentids);
let cur = B[def].next, i = 0;
while (cur && i++ < n) {
  const b = B[cur];
  console.log('--- ' + cur + ' ' + b.opcode + ' ' + JSON.stringify({ fields: b.fields, inputs: b.inputs, mutation: b.mutation }));
  if (b.inputs && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string') {
    const c = B[b.inputs.CONDITION[1]];
    console.log('    COND ' + b.inputs.CONDITION[1] + ' ' + c.opcode + ' ' + JSON.stringify({ fields: c.fields, inputs: c.inputs }));
    for (const k of ['OPERAND1', 'OPERAND2']) {
      const d = c.inputs && c.inputs[k];
      if (d && typeof d[1] === 'string') {
        const e = B[d[1]];
        if (e) console.log('      ' + k + ' ' + d[1] + ' ' + e.opcode + ' ' + JSON.stringify({ fields: e.fields, inputs: e.inputs }));
      }
    }
  }
  cur = b.next;
}
