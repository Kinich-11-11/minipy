// node argwhere.cjs <project.json> <argName> : print the owning procedure of every argument reporter with that name
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const owner = (id) => {
  let cur = id, guard = 0, chain = [];
  while (cur && guard++ < 200) {
    const b = B[cur];
    if (!b) return 'MISSING(' + cur + ')';
    if (b.opcode === 'procedures_definition') {
      const proto = B[b.inputs.custom_block[1]];
      return 'def:' + (proto && proto.mutation ? proto.mutation.proccode : '?') + ' via ' + chain.join('<');
    }
    chain.push(b.opcode.replace(/^.*_/, ''));
    if (chain.length > 6) chain = chain.slice(-6);
    cur = b.parent;
  }
  return 'top-level';
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'argument_reporter_string_number' && b.opcode !== 'argument_reporter_boolean') continue;
  if (!b.fields || !b.fields.VALUE || b.fields.VALUE[0] !== want) continue;
  n++;
  console.log(id + ' value=' + JSON.stringify(b.fields.VALUE[0]) + ' owner=' + owner(id));
}
console.log('reporters named ' + want + ' = ' + n);
