const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p184proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 7) return '?';
  if (v[0] === 12 && typeof v[1] === 'string') return v[1];
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) s += '(' + f[0] + ')'; }
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
const litOf = (q) => { const out = []; const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); }; for (const x of Object.values(q.inputs || {})) rec(x); return out.join('|'); };
const parent = {};
const anc = {};
const build = (id, a) => { let c = id; while (c) { const q = BB[c]; anc[c] = a; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') { parent[v[1]] = c; build(v[1], c); } c = q.next; } };
for (const id of Object.keys(BB)) { const b = BB[id]; if (b.opcode !== 'procedures_definition' || !b.inputs) continue; const pr = BB[b.inputs.custom_block[1]]; if (pr && String(pr.mutation.proccode) === 'eval %s %s') build(b.next, null); }
for (const id of Object.keys(anc)) {
  const q = BB[id];
  if ((litOf(q) + JSON.stringify(q.fields || {})).indexOf(process.argv[2] || 'SyntaxError: expression') < 0) continue;
  console.log('=== block ' + id + ' (' + q.opcode + ')');
  let cur = anc[id], depth = 0;
  while (cur && depth < 6) { const a = BB[cur]; console.log('    ^' + depth + ' ' + cur + ' ' + a.opcode + '  cond=' + (a.inputs && a.inputs.CONDITION ? desc(a.inputs.CONDITION, 0).slice(0, 200) : '-')); cur = anc[cur]; depth++; }
  const prev = parent[id]; if (prev) console.log('    direct parent ' + prev + ' ' + BB[prev].opcode + ' cond=' + (BB[prev].inputs && BB[prev].inputs.CONDITION ? desc(BB[prev].inputs.CONDITION, 0).slice(0, 200) : '-'));
}