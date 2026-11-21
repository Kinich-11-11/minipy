const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const id = process.argv[3];
const depthMax = Number(process.argv[4] || 12);
const lit = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
function show(cur, d) {
  const b = B[cur];
  if (!b) { console.log('  '.repeat(d) + cur + ' <missing>'); return; }
  const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
  const ins = Object.entries(b.inputs || {}).map(([k, v]) => {
    const l = lit(v);
    if (v === undefined) return k + '=?';
    if (typeof v[1] === 'string') return k + '->' + v[1];
    if (Array.isArray(v[1]) && v[1][0] === 12) return k + '=var:' + v[1][1];
    if (Array.isArray(v[1]) && v[1][0] === 13) return k + '=list:' + v[1][1];
    if (l !== null) return k + '=' + l;
    return k + '=' + JSON.stringify(v).slice(0, 40);
  }).join(' ');
  console.log('  '.repeat(d) + cur + ' ' + b.opcode + (f ? ' {' + f + '}' : '') + (ins ? ' [' + ins + ']' : '') + (b.next ? ' next=' + b.next : ''));
  if (d >= depthMax) return;
  for (const [k, v] of Object.entries(b.inputs || {})) if (v && typeof v[1] === 'string') show(v[1], d + 1);
}
show(id, 0);
