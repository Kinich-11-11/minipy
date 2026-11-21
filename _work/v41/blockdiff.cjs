// blockdiff.cjs <a.json> <b.json> : per-target opcode counts + the blocks only in B
const fs = require('fs');
const A = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const Bp = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const cnt = (p) => {
  const out = {};
  for (const t of p.targets) {
    out[t.name] = {};
    for (const b of Object.values(t.blocks || {})) out[t.name][b.opcode] = (out[t.name][b.opcode] || 0) + 1;
  }
  return out;
};
const a = cnt(A), b = cnt(Bp);
for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
  const ta = a[name] || {}, tb = b[name] || {};
  for (const op of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
    const x = ta[op] || 0, y = tb[op] || 0;
    if (x !== y) console.log(name + '  ' + op + '  a=' + x + ' b=' + y);
  }
}
// list the blocks that exist only in B (by opcode+fields signature)
for (const t of Bp.targets) {
  const at = A.targets.find((x) => x.name === t.name);
  const aIds = new Set(Object.keys((at && at.blocks) || {}));
  for (const [id, blk] of Object.entries(t.blocks || {})) {
    if (aIds.has(id)) continue;
    if (!['data_variable', 'data_listcontents'].includes(blk.opcode)) continue;
    console.log('B-only ' + t.name + ' ' + id + ' ' + blk.opcode + ' fields=' + JSON.stringify(blk.fields) + ' parent=' + blk.parent + ' topLevel=' + blk.topLevel);
  }
}
