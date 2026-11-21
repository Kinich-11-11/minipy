const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p182proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
// 归属：块 -> 所属 procedures_definition
const owner = {};
const mark = (id, def) => { let cur = id; while (cur) { owner[cur] = def; const q = BB[cur]; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') mark(v[1], def); cur = q.next; } };
const defName = {};
for (const id of Object.keys(BB)) { const b = BB[id]; if (b.opcode !== 'procedures_definition' || !b.inputs) continue; const pr = BB[b.inputs.custom_block[1]]; defName[id] = pr && pr.mutation ? String(pr.mutation.proccode) : '?'; mark(b.next, id); }
const want = (process.argv[2] || '').split(',').filter(Boolean);
const seen = {};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  const names = [];
  if (q.fields && q.fields.LIST) names.push(q.fields.LIST[0]);
  if (q.fields && q.fields.VARIABLE) names.push(q.fields.VARIABLE[0]);
  for (const n of names) {
    if (!want.includes(n)) continue;
    const d = defName[owner[id]] || '(top)';
    seen[d] = (seen[d] || 0) + 1;
  }
}
console.log(JSON.stringify(seen, null, 1));