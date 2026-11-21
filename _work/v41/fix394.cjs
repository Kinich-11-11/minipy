const fs = require('fs');
let s = fs.readFileSync('_work/v41/p394.txt', 'utf8');
const from = `  let single = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode !== 'control_if_else' || !q.inputs || !q.inputs.CONDITION) continue;
    const raw = JSON.stringify(BB[q.inputs.CONDITION[1]] || {}) + JSON.stringify(q.inputs.CONDITION);
    if (raw.indexOf('narg') < 0) continue;
    // 条件里要有 pow 与 round/int
    const cond = JSON.stringify(q.inputs.CONDITION);
    if (cond.indexOf('pow') >= 0) { single = id; break; }
  }`;
const to = `  // 递归收集条件子树里的变量名与字符串字面量
  const collect = (v, out) => {
    if (!Array.isArray(v)) return;
    if (v[0] === 12 && typeof v[1] === 'string') { out.vars.push(v[1]); return; }
    if (typeof v[1] === 'string' && BB[v[1]]) {
      const q = BB[v[1]];
      if (q.fields && q.fields.VARIABLE) out.vars.push(q.fields.VARIABLE[0]);
      for (const k of Object.keys(q.fields || {})) { const f = q.fields[k]; if (Array.isArray(f) && typeof f[0] === 'string' && f[0] !== '') out.lits.push(f[0]); }
      for (const x of Object.values(q.inputs || {})) collect(x, out);
      return;
    }
    if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.lits.push(String(v[1])); return; }
    if (Array.isArray(v[1])) collect(v[1], out);
  };
  let single = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode !== 'control_if_else' || !q.inputs || !q.inputs.CONDITION) continue;
    const out = { vars: [], lits: [] };
    collect(q.inputs.CONDITION, out);
    const hasNarg = out.vars.indexOf('narg') >= 0;
    const hasPow = out.lits.indexOf('pow') >= 0;
    const hasRound = out.lits.indexOf('round') >= 0;
    if (hasNarg && hasPow && hasRound) { single = id; break; }
  }`;
if (!s.includes(from)) { console.log('MISS finder'); process.exit(1); }
s = s.replace(from, to);
// 同样修正 pwk==3 的查找（要递归看条件）
const from2 = `      const c = JSON.stringify(q.inputs.CONDITION);
      if (c.indexOf('pwk') >= 0 && c.indexOf('pow') >= 0) { target = cur; break; }`;
const to2 = `      const o2 = { vars: [], lits: [] };
      collect(q.inputs.CONDITION, o2);
      if (o2.vars.indexOf('pwk') >= 0 && o2.lits.indexOf('pow') >= 0 && o2.lits.indexOf('3') >= 0) { target = cur; break; }`;
if (!s.includes(from2)) { console.log('MISS pwk finder'); process.exit(1); }
s = s.replace(from2, to2);
fs.writeFileSync('_work/v41/p394.txt', s);
console.log('fixed p394 finders');