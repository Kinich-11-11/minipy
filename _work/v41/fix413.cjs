const fs = require('fs');
let s = fs.readFileSync('_work/v41/p413.txt', 'utf8');
const from = `      if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === 'strval %s %s') {
        const anc = chain.slice(-2);
        const isElemLoop = anc.some((a) => a && a.opcode === 'control_repeat_until');
        const isStyle = anc.some((a) => {
          if (!a || !a.inputs || !a.inputs.CONDITION) return false;
          const cid = a.inputs.CONDITION[1];
          const w = typeof cid === 'string' ? BB[cid] : null;
          return !!(w && w.opcode === 'operator_equals');
        });
        if (isElemLoop && isStyle && !target) target = c;
      }`;
const to = `      if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === 'strval %s %s') {
        const varNames = (v, out) => {
          if (!Array.isArray(v)) return;
          if (v[0] === 12 && typeof v[1] === 'string') { out.push(v[1]); return; }
          if (typeof v[1] === 'string' && BB[v[1]]) {
            const w = BB[v[1]];
            if (w.fields && w.fields.VARIABLE) out.push(w.fields.VARIABLE[0]);
            for (const x of Object.values(w.inputs || {})) varNames(x, out);
            return;
          }
          if (Array.isArray(v[1])) varNames(v[1], out);
        };
        let hit = false;
        for (const a of chain) {
          if (!a || !a.inputs || !a.inputs.CONDITION) continue;
          const o = [];
          varNames(a.inputs.CONDITION, o);
          if (o.indexOf('ppi') >= 0) hit = true;
        }
        if (hit && !target) target = c;
      }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p413.txt', s.replace(from, to));
console.log('finder now keys on ppi');