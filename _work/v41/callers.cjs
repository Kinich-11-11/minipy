// callers.cjs <project.json> "<proccode>" : list owner procedures calling it
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const owners = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  const pc = q && q.mutation ? q.mutation.proccode : '?';
  const seen = new Set(), st = [id];
  while (st.length) {
    const c = st.pop();
    if (!c || seen.has(c)) continue;
    seen.add(c); owners.set(c, pc);
    const x = B[c]; if (!x) continue;
    for (const v of Object.values(x.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (x.next) st.push(x.next);
  }
}
const by = {};
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === want) {
    const o = owners.get(id) || '<top>';
    by[o] = (by[o] || 0) + 1;
  }
}
console.log(JSON.stringify(want) + ' called from:');
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(3) + '  ' + k);
