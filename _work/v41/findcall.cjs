// node findcall.cjs <project.json> "<proccode>" : print every procedures_call for that proccode with its inputs resolved one level
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const desc = (v) => {
  if (!Array.isArray(v)) return JSON.stringify(v);
  if (typeof v[1] === 'string') {
    const b = B[v[1]];
    if (!b) return '[MISSING ' + v[1] + ']';
    return b.opcode + '(' + JSON.stringify(b.fields || {}) + ')';
  }
  return 'lit:' + JSON.stringify(v[1]);
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call') continue;
  if (!b.mutation || b.mutation.proccode !== want) continue;
  n++;
  console.log('--- call ' + id + ' args=' + b.mutation.argumentids);
  for (const [k, v] of Object.entries(b.inputs || {})) console.log('    ' + k + ' = ' + desc(v));
}
console.log('total calls = ' + n);
