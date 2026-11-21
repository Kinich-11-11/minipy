const fs = require('fs');
const needle = process.argv[2] || '';
const maxN = parseInt(process.argv[3] || '40', 10);
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p182proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 8) return '?';
  if (v[0] === 12 && typeof v[1] === 'string') return v[1];
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_|looks_|sensing_|motion_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) s += '(' + f[0] + ')'; }
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  const pc = pr && pr.mutation ? String(pr.mutation.proccode) : '';
  if (pc.indexOf(needle) < 0) continue;
  console.log('=== ' + pc + '  def=' + id);
  let cur = b.next, n = 0;
  while (cur && n < maxN) {
    const q = BB[cur];
    let s = q.opcode.replace(/^(data_|control_|procedures_)/, '') + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '') + (q.mutation ? ' [' + q.mutation.proccode + ']' : '');
    if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) s += '  ' + k + '=' + desc(v, 0);
    console.log('  ' + n + ': ' + s.slice(0, 230));
    cur = q.next; n++;
  }
}