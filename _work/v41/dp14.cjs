// dp14.cjs <condNeedle> —— 找出 eval 里 CONDITION 含某子串的块，打印 id/opcode/完整条件
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p185proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 16) return '?';
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
// 限定在 eval 内
const anc = {};
const build = (id) => { let c = id; while (c) { const q = BB[c]; anc[c] = 1; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') build(v[1]); c = q.next; } };
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (pr && String(pr.mutation.proccode) === 'eval %s %s') { build(b.next); break; }
}
const needle = process.argv[2] || 'narg';
for (const id of Object.keys(anc)) {
  const q = BB[id];
  if (!q.inputs || !q.inputs.CONDITION) continue;
  const s = desc(q.inputs.CONDITION, 0);
  if (s.indexOf(needle) < 0) continue;
  console.log('--- ' + id + ' (' + q.opcode + ')');
  console.log('    ' + s.slice(0, 700));
}
