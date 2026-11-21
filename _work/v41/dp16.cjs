const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const needle = process.argv[2] || '';
const texts = (q) => {
  const out = [];
  if (q.mutation && q.mutation.proccode) out.push(String(q.mutation.proccode));
  for (const k of Object.keys(q.fields || {})) { const f = q.fields[k]; if (Array.isArray(f) && typeof f[0] === 'string') out.push(f[0]); }
  const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); };
  for (const x of Object.values(q.inputs || {})) rec(x);
  return out;
};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  if (texts(q).join('|').indexOf(needle) < 0) continue;
  let cur = id, proc = '(top)', d = 0;
  const seen = new Set();
  while (cur && !seen.has(cur) && d < 300) {
    seen.add(cur);
    const w = BB[cur];
    if (w.opcode === 'procedures_definition' && w.inputs) { const pr = BB[w.inputs.custom_block[1]]; proc = pr && pr.mutation ? String(pr.mutation.proccode) : '?'; break; }
    cur = w.parent; d++;
  }
  console.log(id + '  ' + q.opcode + '  proc=' + proc + '  texts=' + JSON.stringify(texts(q)).slice(0, 120));
}