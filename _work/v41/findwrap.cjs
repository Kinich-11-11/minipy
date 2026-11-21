// find the { comparison that wraps the given OR, if any: node _work/v41/findwrap.cjs <project.json> <orId>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const BL = T.blocks;
const orId = process.argv[3];
const parents = [];
for (const pid of Object.keys(BL)) {
  const b = BL[pid];
  for (const [slot, v] of Object.entries(b.inputs || {})) {
    if (v && v[1] === orId) parents.push(pid + '.' + slot + ' desc=' + JSON.stringify(v).slice(0, 40));
  }
}
console.log('parents of ' + orId + ':');
for (const x of parents) console.log('  ' + x + '  -> ' + BL[x.split('.')[0]].opcode);
// any equals comparing something to '{' whose other side is an OR?
const hits = [];
for (const id of Object.keys(BL)) {
  const b = BL[id];
  if (b.opcode !== 'operator_equals') continue;
  const litOf = (d) => (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') ? d[1]
    : (d && Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4) ? d[1][1] : null);
  const a = litOf(b.inputs.OPERAND1), c = litOf(b.inputs.OPERAND2);
  if (a === '{' || c === '{' || a === '}' || c === '}') {
    const other = a === '{' || a === '}' ? b.inputs.OPERAND2 : b.inputs.OPERAND1;
    const oid = other && other[1];
    hits.push(id + ' lit=' + (a || c) + ' other=' + (typeof oid === 'string' ? (BL[oid] ? BL[oid].opcode : oid) : JSON.stringify(other)));
  }
}
console.log('total { / } comparisons in project: ' + hits.length);
console.log(hits.slice(0, 6).join('\n'));
