// dp22.cjs —— 在 eval 里找"被当作值使用"的 operator_equals / operator_lt / operator_add（非条件）
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
const want = process.argv[2] || 'operator_equals';
let evalDef = null;
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (pr && String(pr.mutation.proccode) === 'eval %s %s') { evalDef = id; break; }
}
if (!evalDef) throw new Error('eval not found');
const anc = {};
const walk = (id, a, depth) => {
  let c = id;
  while (c) {
    const q = BB[c];
    if (!q) break;
    anc[c] = a;
    if (q.opcode === want) {
      // 判断是否被当作"条件"使用：看父块的 CONDITION 是否指向它
      const par = a ? BB[a] : null;
      const asCond = !!(par && par.inputs && par.inputs.CONDITION && par.inputs.CONDITION[1] === c);
      if (!asCond) {
        console.log(c + '  (depth ' + depth + ')');
        let cur = a, d = 0;
        while (cur && d < 4) { const w = BB[cur]; console.log('     ^' + d + ' ' + w.opcode + (w.mutation ? ' «' + String(w.mutation.proccode) + '»' : '') + '  ' + Object.entries(w.inputs || {}).filter(([k]) => k !== 'SUBSTACK' && k !== 'SUBSTACK2').map(([k, v]) => k + '=' + desc(v, 0).slice(0, 70)).join('  ').slice(0, 180)); cur = anc[cur]; d++; }
      }
    }
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], c, depth + 1);
    }
    c = q.next;
  }
};
walk(BB[evalDef].next, null, 0);
