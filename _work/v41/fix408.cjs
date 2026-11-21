const fs = require('fs');
let s = fs.readFileSync('_work/v41/p408.txt', 'utf8');
const from = `      if (q.opcode === 'procedures_call' && q.mutation) {
        const raw = JSON.stringify(q.inputs || {}) + JSON.stringify(q.mutation || {});
        if (raw.indexOf('is not defined') >= 0) target.push(c);
      }`;
const to = `      if (q.opcode === 'procedures_call' && q.mutation) {
        const texts = [];
        const rec = (v) => {
          if (!Array.isArray(v)) return;
          if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') texts.push(String(v[1]));
          else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); }
          else if (Array.isArray(v[1])) rec(v[1]);
        };
        if (q.mutation && q.mutation.proccode) texts.push(String(q.mutation.proccode));
        for (const x of Object.values(q.inputs || {})) rec(x);
        if (texts.join('|').indexOf('is not defined') >= 0) target.push(c);
      }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p408.txt', s.replace(from, to));
console.log('recursive text search installed');