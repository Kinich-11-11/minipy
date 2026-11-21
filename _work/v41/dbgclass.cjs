const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
// find the block that adds the 'nq=' debug entry, then print its chain and the enclosing if
let hit = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'data_addtolist' && JSON.stringify(b.inputs || {}).includes('nq=')) { hit = id; break; }
}
console.log('nq add =', hit);
let cur = hit, n = 0;
console.log('-- chain from nq add --');
while (cur && n++ < 20) {
  const b = B[cur];
  console.log('  ', cur, b.opcode, b.fields && b.fields.LIST ? b.fields.LIST[0] : '', JSON.stringify(b.inputs || {}).slice(0, 70));
  cur = b.next;
}
// the first list statement of the enclosing substack
let top = hit;
while (B[top].parent) top = B[top].parent;
console.log('-- substack head --');
cur = top; n = 0;
while (cur && n++ < 25) {
  const b = B[cur];
  console.log('  ', cur, b.opcode, b.fields && b.fields.LIST ? b.fields.LIST[0] : '', JSON.stringify(b.inputs || {}).slice(0, 70));
  cur = b.next;
}
