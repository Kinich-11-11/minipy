
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
let lookupDef = null;
for (const [id, b] of Object.entries(interp.blocks)) {
  if (b.opcode === 'procedures_definition') { const proto = interp.blocks[b.inputs.custom_block[1]]; if (proto && proto.mutation.proccode === 'lookup %s') lookupDef = id; }
}
console.log('lookup def', lookupDef);
function dump(id, ind, seen, depth) {
  if (!id || depth > 8) return;
  if (seen.has(id)) { console.log(ind + '<seen ' + id + '>'); return; }
  seen.add(id);
  const b = interp.blocks[id];
  if (!b) { console.log(ind + '<?>'); return; }
  console.log(ind + id + ' ' + b.opcode + ' ' + JSON.stringify(b.fields).slice(0, 45) + ' next=' + JSON.stringify(b.next));
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string' && (k === 'SUBSTACK' || k === 'SUBSTACK2')) { console.log(ind + ' [' + k + ']'); dump(v[1], ind + '   ', seen, depth + 1); }
  }
}
const seen = new Set();
let cur = interp.blocks[lookupDef].next, n = 0;
while (cur && n < 10) { dump(cur, ' ', seen, 0); cur = interp.blocks[cur].next; n++; }
