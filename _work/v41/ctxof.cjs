// ctxof.cjs <project.json> <blockId> [up] : dump a block, its parents chain, and the owning if-substack head
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const id0 = process.argv[3];
const up = Number(process.argv[4] || 6);
let cur = id0;
for (let i = 0; i <= up && cur; i++) {
  const b = B[cur];
  if (!b) { console.log('MISSING ' + cur); break; }
  console.log(i + ': ' + cur + '  ' + b.opcode + '  fields=' + JSON.stringify(b.fields || {}));
  console.log('   inputs=' + JSON.stringify(b.inputs || {}).slice(0, 400));
  cur = b.parent;
}
console.log('--- substack head of the nearest control_if above id0 (if any) ---');
let c = id0, guard = 0;
while (c && guard++ < 40) {
  const b = B[c];
  if (b && (b.opcode === 'control_if' || b.opcode === 'control_if_else')) {
    let sub = b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
    let n = 0;
    while (sub && n < 6) {
      const s = B[sub];
      console.log('   ' + s.opcode + ' ' + JSON.stringify(s.fields || {}).slice(0, 120));
      sub = s.next; n++;
    }
    break;
  }
  c = B[c] ? B[c].parent : null;
}
