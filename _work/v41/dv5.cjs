const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p192proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 5) return '?';
  if (v[0] === 12) return String(v[2] || v[1]);
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_|procedures_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) s += '(' + f[0] + ')'; }
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
const line = (id) => {
  const q = BB[id];
  if (!q) return '?';
  let s = q.opcode.replace(/^(data_|control_|procedures_)/, '') + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '') + (q.mutation ? ' «' + String(q.mutation.proccode) + '»' : '');
  if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) { if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue; s += '  ' + k + '=' + desc(v, 0).slice(0, 70); }
  return s;
};
const ids = process.argv.slice(2);
for (const id of ids) {
  console.log('=== ' + id + ' :: ' + line(id).slice(0, 140));
  let cur = BB[id].parent, d = 0;
  const seen = new Set();
  while (cur && !seen.has(cur) && d < 10) {
    seen.add(cur);
    console.log('   ^' + d + ' ' + cur + ' ' + line(cur).slice(0, 150));
    cur = BB[cur].parent; d++;
  }
  console.log('   next: ' + (BB[id].next ? line(BB[id].next).slice(0, 120) : '(none)'));
}
