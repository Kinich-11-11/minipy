// dp10.cjs <needle> —— 统计含某子串的块按过程归属，并列出相关过程名
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p185proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const owner = {};
const build = (id, d) => {
  let c = id;
  while (c) {
    const q = BB[c];
    if (owner[c] === undefined) owner[c] = d;
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') build(v[1], d);
    }
    c = q.next;
  }
};
const defName = {};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  defName[id] = pr && pr.mutation ? String(pr.mutation.proccode) : '?';
  build(b.next, id);
}
const needle = process.argv[2] || 'default';
const hits = {};
for (const id of Object.keys(BB)) {
  const q = BB[id];
  const raw = JSON.stringify(q.inputs || {}) + JSON.stringify(q.fields || {});
  if (raw.indexOf(needle) < 0) continue;
  const d = defName[owner[id]] || '(top)';
  hits[d] = (hits[d] || 0) + 1;
}
console.log('blocks mentioning ' + JSON.stringify(needle) + ':');
console.log(JSON.stringify(hits, null, 1));
const procs = [...new Set(Object.values(BB).filter((b) => b.opcode === 'procedures_prototype' && b.mutation).map((b) => String(b.mutation.proccode)))].sort();
console.log('--- matching proc names ---');
console.log(procs.filter((n) => new RegExp(process.argv[3] || 'minmax|max|min|builtin|kw', 'i').test(n)).join('\n'));
