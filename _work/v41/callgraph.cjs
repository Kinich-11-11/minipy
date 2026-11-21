'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead(process.argv[2] || 'MiniPy_v4.32.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const it = j.targets.find(t => /Interp/i.test(t.name));
const B = it.blocks;
// map each procedure definition -> its proccode, and collect calls inside its body
const defs = {};   // defId -> proccode
for (const [id, b] of Object.entries(B)) {
  if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
    const pr = B[b.inputs.custom_block[1]];
    if (pr && pr.mutation) defs[id] = pr.mutation.proccode;
  }
}
const warp = {};
for (const b of Object.values(B)) if (b.opcode === 'procedures_prototype' && b.mutation) warp[b.mutation.proccode] = b.mutation.warp !== 'false';
const edges = {};  // proccode -> Set(callee proccode)
const walkProc = (defId) => {
  const calls = new Set();
  const seen = new Set();
  const stack = [B[defId].next];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const b = B[id]; if (!b) continue;
    seen.add(id);
    if (b.opcode === 'procedures_call' && b.mutation) calls.add(b.mutation.proccode);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
    if (b.next) stack.push(b.next);
  }
  return calls;
};
for (const [defId, code] of Object.entries(defs)) edges[code] = walkProc(defId);
const target = 'calluser %s %s %s';
const reach = new Set([target]);
let changed = true;
while (changed) {
  changed = false;
  for (const [p, set] of Object.entries(edges)) {
    if (reach.has(p)) continue;
    for (const c of set) if (reach.has(c)) { reach.add(p); changed = true; break; }
  }
}
const list = [...reach].sort();
console.log('procedures that can be an ancestor of calluser (' + list.length + '):');
for (const p of list) console.log('  ' + (warp[p] ? 'WARP   ' : 'nonwarp') + '  ' + p + (edges[p] ? '  -> ' + [...edges[p]].filter(x => reach.has(x)).join(', ') : ''));
console.log('');
console.log('still warp but on the path:', list.filter(p => warp[p]).join(' | '));
