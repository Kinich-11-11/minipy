// dp21.cjs <procSubstr> <regex> [maxLines] —— 递归打印某过程子树里匹配正则的语句
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const proc = process.argv[2] || '';
const re = new RegExp(process.argv[3] || '.', 'i');
const maxLines = parseInt(process.argv[4] || '40', 10);
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 8) return '?';
  if (v[0] === 12 && typeof v[1] === 'string') return v[1];
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_|procedures_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) s += '(' + f[0] + ')'; }
    if (q.mutation && q.mutation.proccode) s += ' «' + String(q.mutation.proccode) + '»';
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
let out = 0;
const walk = (id, depth) => {
  let c = id;
  while (c && out < maxLines) {
    const q = BB[c];
    if (!q) break;
    let s = q.opcode.replace(/^(data_|control_|procedures_)/, '') + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '') + (q.fields && q.fields.LIST ? ' L=' + q.fields.LIST[0] : '') + (q.mutation ? ' «' + String(q.mutation.proccode) + '»' : '');
    if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) { if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue; s += '  ' + k + '=' + desc(v, 0); }
    if (re.test(s)) { console.log('  '.repeat(Math.min(depth, 6)) + c + ' :: ' + s.slice(0, 260)); out++; }
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], depth + 1);
    }
    c = q.next;
  }
};
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (!pr || String(pr.mutation.proccode).indexOf(proc) < 0) continue;
  console.log('=== ' + pr.mutation.proccode);
  walk(b.next, 0);
  break;
}
