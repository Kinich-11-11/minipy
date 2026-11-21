const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p520.txt', 'utf8');
const oldStart = s.indexOf('  // the last-resort fail =');
const oldEnd = s.indexOf("  const handler = IF(");
if (oldStart < 0 || oldEnd < 0) throw new Error('anchors not found');
const replacement = `  // the last-resort fail = the fail in the x8nc-if's else branch
  function hasVar(id, name, seen) {
    if (!id || !BL()[id] || seen.has(id)) return false;
    seen.add(id);
    const b = BL()[id];
    for (const v of Object.values(b.inputs || {})) {
      if (!Array.isArray(v)) continue;
      if (Array.isArray(v[1]) && v[1][0] === 12 && v[1][1] === name) return true;
      if (typeof v[1] === 'string' && hasVar(v[1], name, seen)) return true;
    }
    return false;
  }
  let lastFail = null;
  for (const id of evd) {
    const b = BL()[id];
    if (b.opcode !== 'control_if_else' || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') continue;
    if (!hasVar(b.inputs.CONDITION[1], 'x8nc', new Set())) continue;
    const e = b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1];
    if (e && BL()[e].opcode === 'procedures_call' && BL()[e].mutation.proccode === 'fail %s') { lastFail = e; break; }
  }
  if (!lastFail) throw new Error('[P520] last-resort fail not found');
`;
s = s.slice(0, oldStart) + replacement + s.slice(oldEnd);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p520.txt', s);
console.log('p520 anchor replaced');
