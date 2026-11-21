// dp11.cjs <proccode> —— 列出某过程的调用者（按所属过程归属）与其所在形状
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
const want = process.argv[2] || '';
const callers = {};
const sites = [];
for (const id of Object.keys(BB)) {
  const q = BB[id];
  if (q.opcode !== 'procedures_call' || !q.mutation) continue;
  if (String(q.mutation.proccode).indexOf(want) < 0) continue;
  const d = defName[owner[id]] || '(top)';
  callers[d] = (callers[d] || 0) + 1;
  sites.push(d + ' / ' + id);
}
console.log('callers of ' + JSON.stringify(want) + ':');
console.log(JSON.stringify(callers, null, 1));
console.log('--- site ids ---');
console.log(sites.slice(0, 20).join('\n'));
// 顺便看看该过程的参数名
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_prototype' || !b.mutation) continue;
  const pc = String(b.mutation.proccode);
  if (pc.indexOf(want) < 0) continue;
  console.log('proto ' + pc + ' names=' + b.mutation.argumentnames);
}
