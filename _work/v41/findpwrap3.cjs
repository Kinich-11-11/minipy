const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
for (const id of Object.keys(B)) {
  const j = JSON.stringify(B[id]);
  if (!j.includes('pwrap')) continue;
  const b = B[id];
  console.log(id + '  ' + b.opcode + '  parent=' + (b.parent || '-') + '  ' + j.slice(0, 150));
}
