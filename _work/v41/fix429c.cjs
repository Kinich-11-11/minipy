const fs = require('fs');
let s = fs.readFileSync('_work/v41/p429.txt', 'utf8');
const from = `    const cu = defIdOf('calluser %s %s %s');
    let firstAssign = null;
    const walk = (id) => {
      let c = id;
      while (c) {
        const q = BB[c];
        if (!q) break;
        if (!firstAssign && q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === 'assign %s %s %s') firstAssign = c;
        for (const [k, v] of Object.entries(q.inputs || {})) {
          if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]);
        }
        c = q.next;
      }
    };
    walk(BB[cu].next);
    if (!firstAssign) throw new Error('[P429] first assign in calluser not found');
    console.log('[P429] calluser first assign=' + firstAssign);`;
const to = `    const cu = defIdOf('calluser %s %s %s');
    // 以"missing argument"报错所在的那个 IFELSE 为锚点（此时 UArgV 已建好）
    const textsOf = (q) => { const out = []; const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); }; for (const x of Object.values(q.inputs || {})) rec(x); return out.join('|'); };
    const hasMissing = (startId) => { let hit = false; const rec = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; if (q.opcode === 'procedures_call' && textsOf(q).indexOf('missing argument') >= 0) hit = true; for (const [k, v] of Object.entries(q.inputs || {})) { if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') rec(v[1]); } c = q.next; } }; rec(startId); return hit; };
    let firstAssign = null;
    const walk = (id) => {
      let c = id;
      while (c) {
        const q = BB[c];
        if (!q) break;
        if (!firstAssign && q.opcode === 'control_if_else' && q.inputs && (hasMissing(q.inputs.SUBSTACK ? q.inputs.SUBSTACK[1] : null) || hasMissing(q.inputs.SUBSTACK2 ? q.inputs.SUBSTACK2[1] : null))) firstAssign = c;
        for (const [k, v] of Object.entries(q.inputs || {})) {
          if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]);
        }
        c = q.next;
      }
    };
    walk(BB[cu].next);
    if (!firstAssign) throw new Error('[P429] the missing-argument IFELSE in calluser not found');
    console.log('[P429] calluser anchor IFELSE=' + firstAssign);`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p429.txt', s.replace(from, to));
console.log('anchor switched to the missing-argument IFELSE');