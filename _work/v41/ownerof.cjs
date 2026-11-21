// node ownerof.cjs <project.json> <blockId> : print the enclosing procedure of a block
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
let cur = process.argv[3], chain = [], guard = 0;
while (cur && guard++ < 300) {
  const b = B[cur];
  if (!b) { console.log('MISSING ' + cur); break; }
  if (b.opcode === 'procedures_definition') {
    const proto = B[b.inputs.custom_block[1]];
    console.log('inside ' + (proto && proto.mutation ? proto.mutation.proccode : '?'));
    break;
  }
  chain.push(b.opcode);
  if (chain.length > 8) chain = chain.slice(-8);
  cur = b.parent;
}
console.log('chain ' + chain.join(' < '));
