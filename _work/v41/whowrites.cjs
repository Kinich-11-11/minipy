// whowrites.cjs <project.json> <varName> [...] : which procedures write (and read) a variable
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const names = process.argv.slice(3);
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
    const c = st.pop(); if (!c || seen.has(c)) continue;
    seen.add(c); owners.set(c, pc);
    const x = B[c]; if (!x) continue;
    for (const v of Object.values(x.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (x.next) st.push(x.next);
  }
}
for (const nm of names) {
  const w = new Set(), r = new Set();
  const scanInputs = (v) => {
    if (Array.isArray(v)) {
      if (v[0] === 12 && v[1] === nm) r.add('INPUT');
      for (const e of v) scanInputs(e);
    }
  };
  for (const id of Object.keys(B)) {
    const b = B[id];
    const own = owners.get(id) || '?';
    if ((b.opcode === 'data_setvariableto' || b.opcode === 'data_changevariableby')
      && b.fields.VARIABLE && b.fields.VARIABLE[0] === nm) w.add(own);
    if (b.opcode === 'data_variable' && b.fields.VARIABLE && b.fields.VARIABLE[0] === nm) r.add(own);
    for (const v of Object.values(b.inputs || {})) { const before = r.size; scanInputs(v); if (r.size > before) r.add(own); }
  }
  console.log(nm.padEnd(10) + ' writers: ' + [...w].sort().join(', '));
  console.log(''.padEnd(10) + ' readers: ' + [...r].slice(0, 12).sort().join(', '));
}
