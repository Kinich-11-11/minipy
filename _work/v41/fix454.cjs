const fs = require('fs');
let s = fs.readFileSync('_work/v41/p454.txt', 'utf8');
const from = "  let handler = null;";
const to = `  let handler = null;
  {
    let dbg = 0;
    for (const id of Object.keys(BB)) {
      const q = BB[id];
      if (q.opcode !== 'operator_equals' || !q.inputs) continue;
      const o = [];
      for (const x of Object.values(q.inputs)) collect(x, o);
      if (o.indexOf('list') < 0) continue;
      dbg++;
      const par = q.parent;
      const w = par ? BB[par] : null;
      console.log('[P454] cand ' + id + ' names=' + o.join(',') + ' parent=' + (w ? w.opcode : 'none') + ' hasSub=' + !!(w && w.inputs && w.inputs.SUBSTACK));
    }
    console.log('[P454] candidates with list literal=' + dbg);
  }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p454.txt', s.replace(from, to));
console.log('diagnostic added');