const fs = require('fs');
let s = fs.readFileSync('_work/v41/p431.txt', 'utf8');
const from = `    let setSelf = null;
    let c = BB[cc].next;
    while (c) {
      const q = BB[c];
      if (q.opcode === 'data_setvariableto' && q.fields && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'self') { setSelf = c; break; }
      c = q.next;
    }`;
const to = `    let setSelf = null;
    const textsOf2 = (q) => { const out = []; const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); }; for (const x of Object.values(q.inputs || {})) rec(x); return out.join('|'); };
    const findSelf = (id) => {
      let c = id;
      while (c) {
        const q = BB[c];
        if (!q) break;
        if (!setSelf && q.opcode === 'data_setvariableto' && q.fields && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'self'
            && textsOf2(q).indexOf('cinst') >= 0) setSelf = c;
        for (const [k, v] of Object.entries(q.inputs || {})) {
          if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') findSelf(v[1]);
        }
        c = q.next;
      }
    };
    findSelf(BB[cc].next);`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p431.txt', s.replace(from, to));
console.log('recursive self= finder installed');