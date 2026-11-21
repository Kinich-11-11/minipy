// node neigh.cjs <project.json> <blockId> : print the parent, the previous/next siblings and the parent's substack key
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const id = process.argv[3];
const b = B[id];
console.log('block ' + id + ' ' + b.opcode + ' parent=' + b.parent + ' next=' + b.next + ' top=' + b.topLevel);
const par = B[b.parent];
if (!par) { console.log('(no parent)'); process.exit(0); }
console.log('parent ' + b.parent + ' ' + par.opcode + ' fields=' + JSON.stringify(par.fields));
for (const [k, v] of Object.entries(par.inputs || {})) {
  if (v && typeof v[1] === 'string') console.log('  input ' + k + ' -> ' + v[1] + ' ' + (B[v[1]] ? B[v[1]].opcode : 'MISSING'));
}
// walk back to the first sibling
let first = id;
while (B[first] && B[first].parent === b.parent && B[first].prev) first = B[first].prev;
if (first === id && B[id].prev) first = B[id].prev;
let cur = first, i = 0;
while (cur && i++ < 30) {
  const q = B[cur];
  console.log('  sib ' + i + ' ' + cur + ' ' + q.opcode + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '') + (cur === id ? '   <== this' : ''));
  cur = q.next;
}
