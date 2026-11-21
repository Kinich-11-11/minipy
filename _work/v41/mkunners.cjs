// make parallel runner copies with distinct CPython temp files (run.mjs uses one shared _tmp.py)
const fs = require('fs');
const src = fs.readFileSync('_work/v41/run.mjs', 'utf8');
const names = ['A', 'B', 'C', 'D', 'E', 'F'];
for (const n of names) {
  let s = src.replace(/_tmp\.py/g, '_tmp' + n + '.py');
  if (s === src) throw new Error('temp path not found');
  fs.writeFileSync('_work/v41/run' + n + '.mjs', s);
}
console.log('wrote runners: ' + names.join(' '));
