const fs = require('fs');
let s = fs.readFileSync('_work/v41/p402.txt', 'utf8');
const from = `          const a = q.inputs[keys[0]];
          const w = Array.isArray(a) && typeof a[1] === 'string' ? BB[a[1]] : null;
          if (w && w.opcode === 'data_variable' && w.fields.VARIABLE && w.fields.VARIABLE[0] === 'mkklo') keyEval = c;`;
const to = `          const a = q.inputs[keys[0]];
          let vname = null;
          if (Array.isArray(a)) {
            if (typeof a[1] === 'string' && BB[a[1]]) { const w = BB[a[1]]; if (w.opcode === 'data_variable' && w.fields.VARIABLE) vname = w.fields.VARIABLE[0]; }
            else if (Array.isArray(a[1]) && a[1][0] === 12 && typeof a[1][2] === 'string') vname = a[1][2];
          }
          if (vname === 'mkklo') keyEval = c;`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p402.txt', s.replace(from, to));
console.log('variable-input unwrap fixed');