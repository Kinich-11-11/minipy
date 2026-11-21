// node argscan.cjs <project.json> "<proccode>" : list argument reporters reachable inside a procedure
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
if (!def) throw new Error('no def ' + want);
const seen = new Set();
const stack = [def];
const found = [];
while (stack.length) {
  const id = stack.pop();
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const b = B[id];
  if (!b) continue;
  if (b.opcode.startsWith('argument_reporter')) found.push(id + ' VALUE=' + JSON.stringify(b.fields.VALUE));
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
console.log('reachable blocks = ' + seen.size);
console.log(found.join('\n') || '(no argument reporters)');
