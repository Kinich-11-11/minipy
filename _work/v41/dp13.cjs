// dp13.cjs <blockId> [depth] —— 打印某块 CONDITION 的完整表达式树
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p185proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const maxD = parseInt(process.argv[3] || '14', 10);
const desc = (v, d) => {
  if (!Array.isArray(v)) return '?';
  if (d > maxD) return '...';
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
const id = process.argv[2];
const q = BB[id];
console.log('block ' + id + ' opcode=' + q.opcode);
if (q.inputs && q.inputs.CONDITION) console.log(desc(q.inputs.CONDITION, 0));
// 顺便打印它两个分支的前几条语句
for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
  if (!q.inputs || !q.inputs[slot]) continue;
  console.log('--- ' + slot);
  let c = q.inputs[slot][1], n = 0;
  while (c && n < 10) { const w = BB[c]; let s = w.opcode.replace(/^(data_|control_|procedures_)/, '') + (w.fields && w.fields.VARIABLE ? ' ' + w.fields.VARIABLE[0] : '') + (w.mutation ? ' [' + w.mutation.proccode + ']' : ''); if (w.inputs) for (const [k, v] of Object.entries(w.inputs)) { if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue; s += '  ' + k + '=' + desc(v, 0).slice(0, 120); } console.log('   ' + n + ': ' + s.slice(0, 260)); c = w.next; n++; }
}
