// dp19.cjs <rootId> —— 列出某子树里所有 procedures_call（含 proccode）及其最近祖先条件
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p186proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 6) return '?';
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
const walk = (id, a, depth) => {
  let c = id;
  while (c && depth < 30) {
    const q = BB[c];
    if (!q) break;
    anc[c] = a;
    if (q.opcode === 'procedures_call' && q.mutation) {
      console.log(c + '  «' + String(q.mutation.proccode) + '»');
      let cur = a, d = 0;
      while (cur && d < 4) { const w = BB[cur]; console.log('      ^' + d + ' ' + w.opcode + '  cond=' + (w.inputs && w.inputs.CONDITION ? desc(w.inputs.CONDITION, 0).slice(0, 150) : '-')); cur = anc[cur]; d++; }
    }
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], c, depth + 1);
    }
    c = q.next;
  }
};
walk(process.argv[2], null, 0);
