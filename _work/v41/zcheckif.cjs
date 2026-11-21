// find IF( calls with 3 top-level args in patch files
const fs = require('fs');
for (const f of ['p500.txt', 'p501.txt', 'p502.txt', 'p503.txt']) {
  const src = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/' + f, 'utf8');
  let idx = 0;
  while ((idx = src.indexOf('IF(', idx)) >= 0) {
    const before = src[idx - 1] || '';
    if (/[A-Za-z_$]/.test(before)) { idx += 3; continue; }
    let i = idx + 3, depth = 1, args = [], cur = '', inStr = null, done = false;
    for (; i < src.length && !done; i++) {
      const ch = src[i];
      if (inStr) { cur += ch; if (ch === inStr && src[i - 1] !== '\\') inStr = null; continue; }
      if (ch === "'" || ch === '"') { inStr = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') { depth++; cur += ch; continue; }
      if (ch === ')' || ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) { args.push(cur); done = true; } else cur += ch;
        continue;
      }
      if (ch === ',' && depth === 1) { args.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (args.length === 3) {
      const lineNo = src.slice(0, idx).split('\n').length;
      console.log(f + ':' + lineNo + ' IF with 3 args');
    }
    idx += 3;
  }
}
