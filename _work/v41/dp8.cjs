const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/_p184proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const owner = {};
const build = (id, d) => { let c = id; while (c) { const q = BB[c]; if (owner[c] === undefined) owner[c] = d; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') build(v[1], d); c = q.next; } };
const defName = {};
for (const id of Object.keys(BB)) { const b = BB[id]; if (b.opcode !== 'procedures_definition' || !b.inputs) continue; const pr = BB[b.inputs.custom_block[1]]; defName[id] = pr && pr.mutation ? String(pr.mutation.proccode) : '?'; build(b.next, id); }
// 字符串字面量里含 expression 的块（用 raw JSON 搜，避免漏掉深层嵌套）
const needle = process.argv[2] || 'expression';
const byProc = {};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  const raw = JSON.stringify(q.inputs || {});
  if (raw.indexOf(needle) < 0) continue;
  const d = defName[owner[id]] || '(top)';
  byProc[d] = (byProc[d] || 0) + 1;
}
console.log('claiming "' + needle + '" in inputs:');
console.log(JSON.stringify(byProc, null, 1));