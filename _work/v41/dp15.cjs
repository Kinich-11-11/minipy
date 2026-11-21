// dp15.cjs <blockId>... —— 打印指定块的祖先条件链（含 mutation.proccode）
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 8) return '?';
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
const anc = {};
const build = (id, a) => { let c = id; while (c) { const q = BB[c]; anc[c] = a; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') build(v[1], c); c = q.next; } };
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (pr && String(pr.mutation.proccode) === 'eval %s %s') { build(b.next, null); break; }
}
for (const id of process.argv.slice(2)) {
  const q = BB[id];
  if (!q) { console.log('MISSING ' + id); continue; }
  console.log('=== ' + id + ' ' + q.opcode + (q.mutation ? ' [' + q.mutation.proccode + ']' : ''));
  let cur = anc[id], d = 0;
  while (cur && d < 8) { const a = BB[cur]; console.log('    ^' + d + ' ' + cur + ' ' + a.opcode + (a.mutation ? ' [' + a.mutation.proccode + ']' : '') + '  cond=' + (a.inputs && a.inputs.CONDITION ? desc(a.inputs.CONDITION, 0).slice(0, 190) : '-')); cur = anc[cur]; d++; }
}
