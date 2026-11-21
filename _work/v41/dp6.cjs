const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p378proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const owner = {};
const mark = (id, def) => { let cur = id; while (cur) { owner[cur] = def; const q = BB[cur]; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') mark(v[1], def); cur = q.next; } };
const defName = {};
for (const id of Object.keys(BB)) { const b = BB[id]; if (b.opcode !== 'procedures_definition' || !b.inputs) continue; const pr = BB[b.inputs.custom_block[1]]; defName[id] = pr && pr.mutation ? String(pr.mutation.proccode) : '?'; mark(b.next, id); }
const needle = process.argv[2] || 'is not defined';
const byProc = {};
const literal = (q) => {
  const out = [];
  const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { for (const x of Object.values(BB[v[1]].inputs || {})) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); };
  for (const x of Object.values(q.inputs || {})) rec(x);
  return out.join('|');
};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  const lits = literal(q);
  if (lits.indexOf(needle) < 0) continue;
  const d = defName[owner[id]] || '(top)';
  byProc[d] = (byProc[d] || 0) + 1;
}
console.log('procs whose blocks contain "' + needle + '":');
console.log(JSON.stringify(byProc, null, 1));
// lookup %s 的调用者
const callers = {};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  if (q.opcode !== 'procedures_call' || !q.mutation) continue;
  if (String(q.mutation.proccode) !== 'lookup %s') continue;
  const d = defName[owner[id]] || '(top)';
  callers[d] = (callers[d] || 0) + 1;
}
console.log('callers of lookup %s:');
console.log(JSON.stringify(callers, null, 1));