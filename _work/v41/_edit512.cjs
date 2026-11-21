const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p512.txt', 'utf8');
const startMarker = '  const ownerIf = (() => {';
const endMarker = '  })();';
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('ownerIf block not found');
const replacement = `  const condTexts = (cid) => {
    const seen = new Set();
    const out = [];
    const st2 = [cid];
    while (st2.length) {
      const x = st2.pop();
      if (!x || seen.has(x) || !BL()[x]) continue;
      seen.add(x);
      const bb = BL()[x];
      for (const v of Object.values(bb.inputs || {})) {
        if (!Array.isArray(v)) continue;
        if (Array.isArray(v[1])) out.push(v[1].join(','));
        if (typeof v[1] === 'string') st2.push(v[1]);
      }
    }
    return out;
  };
  const ownerIf = (() => {
    const ifs = find(ex, (b) => b.opcode === 'control_if');
    let best = null; let bestSize = 1e9;
    for (const iid of ifs) {
      const sub = reach(iid);
      if (!sub.has(caxSets[0])) continue;
      const ts = condTexts(BL()[iid].inputs.CONDITION[1]).join('|');
      if (ts.includes(',.,') && ts.includes(',=,')) {
        if (sub.size < bestSize) { best = iid; bestSize = sub.size; }
      }
    }
    return best;
  })`;
s = s.slice(0, start) + replacement + s.slice(end + endMarker.length);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p512.txt', s);
console.log('p512 owner-if finder replaced');
