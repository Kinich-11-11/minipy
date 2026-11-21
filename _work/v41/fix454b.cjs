const fs = require('fs');
let s = fs.readFileSync('_work/v41/p454.txt', 'utf8');
const from = "  let handler = null;\n  {\n    let dbg = 0;";
const to = `  let handler = null;
  {
    let dbg2 = 0;
    for (const id of Object.keys(BB)) {
      const q = BB[id];
      if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;
      const o = [];
      collect(q.inputs.CONDITION, o);
      if (o.indexOf('list') < 0) continue;
      dbg2++;
      console.log('[P454] ifcand ' + id + ' names=' + o.join(',') + ' hasSub=' + !!q.inputs.SUBSTACK);
    }
    console.log('[P454] control_if candidates=' + dbg2);
  }
  {
    let dbg = 0;`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p454.txt', s.replace(from, to));
console.log('control_if scan added');