// 打印 callval 的 prototype 与定义体前若干语句
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 7) return '?';
  if (v[0] === 12 && typeof v[1] === 'string') return v[1];
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null) s += '(' + f[0] + ')'; }
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode === 'procedures_prototype' && b.mutation && String(b.mutation.proccode).indexOf('callval') >= 0) {
    console.log('proto ' + id + ' ' + JSON.stringify(b.mutation).slice(0, 300));
  }
}
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (!pr || !pr.mutation || String(pr.mutation.proccode).indexOf('callval') < 0) continue;
  console.log('def=' + id);
  let cur = BB[id].next, n = 0;
  while (cur && n < 14) {
    const q = BB[cur];
    let s = q.opcode + (q.fields && q.fields.VARIABLE ? ' V=' + q.fields.VARIABLE[0] : '') + (q.mutation ? ' [' + q.mutation.proccode + ']' : '');
    if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) s += '  ' + k + '=' + desc(v, 0);
    console.log('  ' + n + ': ' + s.slice(0, 200));
    cur = q.next; n++;
  }
}
