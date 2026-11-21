const fs = require('fs');
let s = fs.readFileSync('_work/v41/p402.txt', 'utf8');
const from = "  if (!keyEval || !minkeyCall || !last) throw new Error('[P402] keyEval/minkey/last missing');";
const to = `  if (!keyEval || !minkeyCall || !last) {
    const dd = (v, d) => { if (!Array.isArray(v) || d > 6) return '?'; if (v[0] === 12 && typeof v[1] === 'string') return v[1]; if (typeof v[1] === 'string' && BB[v[1]]) { const q = BB[v[1]]; let t = q.opcode.replace(/^(operator_|data_|argument_|control_)/, ''); if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) t += '(' + f[0] + ')'; } const kk = Object.values(q.inputs || {}).map((x) => dd(x, d + 1)).filter((x) => x !== '?'); return t + (kk.length ? '[' + kk.join(',') + ']' : ''); } if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1])); if (Array.isArray(v[1])) return dd(v[1], d + 1); return '?'; };
    console.log('[P402] keIf cond=' + dd(BB[keIf].inputs.CONDITION, 0));
    console.log('[P402] badIf opcode=' + BB[badIf].opcode + ' cond=' + (BB[badIf].inputs && BB[badIf].inputs.CONDITION ? dd(BB[badIf].inputs.CONDITION, 0) : '-'));
    let c3 = elseFirst, n3 = 0;
    while (c3 && n3 < 12) { const q = BB[c3]; console.log('[P402]   else#' + n3 + ' ' + q.opcode + (q.mutation ? ' «' + String(q.mutation.proccode) + '»' : '') + (q.fields && q.fields.VARIABLE ? ' ' + q.fields.VARIABLE[0] : '')); c3 = q.next; n3++; }
    throw new Error('[P402] keyEval/minkey/last missing');
  }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p402.txt', s.replace(from, to));
console.log('diagnostics added');