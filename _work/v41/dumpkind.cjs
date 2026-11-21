// every data_addtolist on Kind with the literal/expression appended, inside tokenize
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
function R(d, depth = 0) {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return JSON.stringify(t);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return '?';
    if (depth > 3) return b.opcode;
    const ins = Object.entries(b.inputs || {}).map(([k, v]) => R(v, depth + 1)).join(',');
    return b.opcode + '(' + ins + ')';
  }
  return JSON.stringify(d).slice(0, 30);
}
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'data_addtolist' || !b.fields.LIST || b.fields.LIST[0] !== 'Kind') continue;
  console.log('Kind += ' + R(b.inputs.ITEM) + '   (block ' + id + ')');
}
