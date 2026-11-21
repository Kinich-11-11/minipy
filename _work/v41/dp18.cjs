// dp18.cjs <blockId> [maxStmts] [maxDepth] —— 从某块开始按执行顺序打印子树（含嵌套）
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const maxN = parseInt(process.argv[3] || '80', 10);
const maxD = parseInt(process.argv[4] || '4', 10);
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 10) return '?';
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
let n = 0;
const walk = (id, depth, label) => {
  let c = id;
  while (c && n < maxN) {
    const q = BB[c];
    let s = q.opcode.replace(/^(data_|control_|procedures_)/, '') + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '') + (q.fields && q.fields.LIST ? ' L=' + q.fields.LIST[0] : '') + (q.mutation ? ' «' + String(q.mutation.proccode) + '»' : '');
    if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) { if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue; s += '  ' + k + '=' + desc(v, 0); }
    console.log('  '.repeat(depth) + label + n + ': ' + s.slice(0, 300));
    n++;
    if (depth < maxD) {
      for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
        if (q.inputs && q.inputs[slot] && typeof q.inputs[slot][1] === 'string') {
          console.log('  '.repeat(depth + 1) + '--- ' + slot);
          walk(q.inputs[slot][1], depth + 2, '');
        }
      }
    }
    c = q.next;
  }
};
walk(process.argv[2], 0, '');
