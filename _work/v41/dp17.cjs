const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const vars = new Set(), lists = new Set(), procs = new Set();
const walk = (id, d) => {
  let c = id;
  while (c && d < 60) {
    const q = BB[c];
    if (q.fields && q.fields.VARIABLE) vars.add(q.fields.VARIABLE[0]);
    if (q.fields && q.fields.LIST) lists.add(q.fields.LIST[0]);
    if (q.mutation && q.mutation.proccode) procs.add(String(q.mutation.proccode));
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], d + 1);
    }
    c = q.next;
  }
};
walk(process.argv[2], 0);
console.log('vars : ' + [...vars].sort().join(' '));
console.log('lists: ' + [...lists].sort().join(' '));
console.log('procs: ' + [...procs].sort().join(' | '));