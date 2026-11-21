const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p192proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const owner = {};
const build = (id, d) => { let c = id; while (c) { const q = BB[c]; if (!q) break; if (owner[c] === undefined) owner[c] = d; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') build(v[1], d); c = q.next; } };
const defName = {};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  defName[id] = pr && pr.mutation ? String(pr.mutation.proccode) : '?';
  build(b.next, id);
}
const names = process.argv.slice(2);
const counts = {};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  const fields = [];
  for (const k of Object.keys(q.fields || {})) {
    const f = q.fields[k];
    if (Array.isArray(f) && typeof f[0] === 'string') fields.push(f[0]);
  }
  const hit = fields.filter((f) => names.indexOf(f) >= 0);
  if (!hit.length) continue;
  for (const h of hit) {
    const key = defName[owner[id]] + ' :: ' + q.opcode.replace(/^data_/, '') + ' ' + h;
    counts[key] = (counts[key] || 0) + 1;
  }
}
console.log(Object.entries(counts).map(([k, v]) => v + '  ' + k).join('\n'));
