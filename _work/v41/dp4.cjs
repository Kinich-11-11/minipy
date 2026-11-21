const fs = require('fs');
const proc = process.argv[2] || '';
const want = (process.argv[3] || '').split(',').filter(Boolean);
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p182proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const txt = (id) => {
  const q = BB[id]; if (!q) return '';
  let s = q.opcode + (q.fields && q.fields.VARIABLE ? ' V=' + q.fields.VARIABLE[0] : '') + (q.fields && q.fields.LIST ? ' L=' + q.fields.LIST[0] : '') + (q.mutation ? ' [' + q.mutation.proccode + ']' : '');
  for (const [k, v] of Object.entries(q.inputs || {})) {
    if (typeof v[1] === 'string' && BB[v[1]]) s += '  ' + k + '{' + txt(v[1]) + '}';
    else if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') s += '  ' + k + '="' + v[1] + '"';
  }
  return s;
};
const hit = (id) => { const s = txt(id); return want.some((w) => s.indexOf(w) >= 0); };
const walk = (id, depth, out) => {
  let cur = id;
  while (cur) {
    const q = BB[cur];
    if (hit(cur)) out.push('    '.repeat(depth) + cur + ': ' + txt(cur).slice(0, 200));
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], depth + 1, out);
    }
    cur = q.next;
  }
};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  const pc = pr && pr.mutation ? String(pr.mutation.proccode) : '';
  if (pc.indexOf(proc) < 0) continue;
  console.log('=== ' + pc);
  const out = []; walk(b.next, 0, out);
  console.log(out.length ? out.join('\n') : '(no match)');
}