const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const needle = process.argv[3];
const lit = (d, B) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
function subtree(id, seen = new Set()) {
  if (!id || seen.has(id)) return seen;
  seen.add(id);
  const b = B[id];
  if (!b) return seen;
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') subtree(v[1], seen);
  if (b.next) subtree(b.next, seen);
  return seen;
}
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'control_if_else' && b.opcode !== 'control_if') continue;
  if (!subtree(id).has(needle)) continue;
  const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
  console.log('MATCH ' + id + ' ' + b.opcode + (f ? ' {' + f + '}' : ''));
  const dump = (x, d) => {
    let cur = x, guard = 0;
    while (cur && guard++ < 200) {
      const c = B[cur];
      if (!c) break;
      const ins = Object.entries(c.inputs || {}).map(([k, v]) => {
        const l = lit(v, B);
        if (typeof v[1] === 'string') return k + '->' + v[1];
        if (Array.isArray(v[1]) && v[1][0] === 12) return k + '=var:' + v[1][1];
        if (l !== null) return k + '=' + l;
        return k + '=?';
      }).join(' ');
      console.log('  '.repeat(d) + cur + ' ' + c.opcode + ' [' + ins + ']');
      for (const k of ['SUBSTACK', 'SUBSTACK2']) {
        const v = c.inputs && c.inputs[k];
        if (v && typeof v[1] === 'string') { console.log('  '.repeat(d + 1) + '--' + k); dump(v[1], d + 2); }
      }
      cur = c.next;
    }
  };
  dump(id, 0);
  break;
}
