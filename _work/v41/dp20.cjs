// dp20.cjs —— 按模式定位 eval 里 max/min 关键字区（cond 含 narg 且字面量含 min/max），列出其中的调用
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
const info = (v, o) => {
  if (!Array.isArray(v)) return;
  if (v[0] === 12 && typeof v[1] === 'string') { o.vars.push(v[1]); return; }
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    if (q.fields && q.fields.VARIABLE) o.vars.push(q.fields.VARIABLE[0]);
    for (const k of Object.keys(q.fields || {})) { const f = q.fields[k]; if (Array.isArray(f) && typeof f[0] === 'string' && f[0] !== '') o.lits.push(f[0]); }
    for (const x of Object.values(q.inputs || {})) info(x, o);
    return;
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { o.lits.push(String(v[1])); return; }
  if (Array.isArray(v[1])) info(v[1], o);
};
// 找根：cond 含 narg 与 min/max，且子树里有 'key'
const roots = [];
for (const id of Object.keys(BB)) {
  const q = BB[id];
  if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;
  const o = { vars: [], lits: [] };
  info(q.inputs.CONDITION, o);
  if (o.vars.indexOf('narg') < 0 || o.lits.indexOf('min') < 0 || o.lits.indexOf('max') < 0) continue;
  roots.push(id);
}
console.log('roots=' + JSON.stringify(roots));
const anc = {};
const walk = (id, a, depth) => {
  let c = id;
  while (c && depth < 60) {
    const q = BB[c];
    if (!q) break;
    anc[c] = a;
    if (q.opcode === 'procedures_call' && q.mutation) {
      console.log(c + '  «' + String(q.mutation.proccode) + '»');
      let cur = a, d = 0;
      while (cur && d < 5) { const w = BB[cur]; console.log('      ^' + d + ' ' + w.opcode + '  cond=' + (w.inputs && w.inputs.CONDITION ? desc(w.inputs.CONDITION, 0).slice(0, 140) : '-')); cur = anc[cur]; d++; }
    }
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], c, depth + 1);
    }
    c = q.next;
  }
};
for (const r of roots) walk(r, null, 0);
