const fs = require('fs');
let s = fs.readFileSync('_work/v41/p402.txt', 'utf8');
const from = `  let keyEval = null, minkeyCall = null, last = null;
  let c = elseFirst;
  while (c) {
    const q = BB[c];
    if (!q) break;
    if (q.opcode === 'procedures_call' && q.mutation) {
      const pc = String(q.mutation.proccode);
      if (!keyEval && pc === 'eval %s %s') {
        const keys = Object.keys(q.inputs || {});
        const a = q.inputs[keys[0]];
        const w = Array.isArray(a) && typeof a[1] === 'string' ? BB[a[1]] : null;
        if (w && w.opcode === 'data_variable' && w.fields.VARIABLE && w.fields.VARIABLE[0] === 'mkklo') keyEval = c;
      }
      if (!minkeyCall && pc === 'minkey') minkeyCall = c;
    }
    last = c;
    c = q.next;
  }`;
const to = `  let keyEval = null, minkeyCall = null, last = null;
  const findCalls = (id) => {
    let c = id;
    while (c) {
      const q = BB[c];
      if (!q) break;
      if (q.opcode === 'procedures_call' && q.mutation) {
        const pc = String(q.mutation.proccode);
        if (!keyEval && pc === 'eval %s %s') {
          const keys = Object.keys(q.inputs || {});
          const a = q.inputs[keys[0]];
          const w = Array.isArray(a) && typeof a[1] === 'string' ? BB[a[1]] : null;
          if (w && w.opcode === 'data_variable' && w.fields.VARIABLE && w.fields.VARIABLE[0] === 'mkklo') keyEval = c;
        }
        if (!minkeyCall && pc === 'minkey') minkeyCall = c;
      }
      for (const [k, v] of Object.entries(q.inputs || {})) {
        if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') findCalls(v[1]);
      }
      c = q.next;
    }
  };
  findCalls(elseFirst);
  { let c2 = elseFirst; while (c2) { last = c2; c2 = BB[c2].next; } }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p402.txt', s.replace(from, to));
console.log('recursive search installed');