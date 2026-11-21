
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const inIf = 'a9934c62dae24942a1fa';
const b = interp.blocks[inIf];
console.log('in-if:', b.opcode, 'cond=', JSON.stringify(b.inputs.CONDITION), 'sub=', JSON.stringify(b.inputs.SUBSTACK));
function dump(id, ind, seen) {
  if (!id) return;
  if (seen.has(id)) { console.log(ind + '<CYCLE back to ' + id + '>'); return; }
  seen.add(id);
  const blk = interp.blocks[id];
  if (!blk) { console.log(ind + '<?' + id + '>'); return; }
  console.log(ind + id + ' ' + blk.opcode + ' ' + JSON.stringify(blk.fields).slice(0, 60) + ' next=' + blk.next);
  for (const [k, v] of Object.entries(blk.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string' && (k === 'SUBSTACK' || k === 'SUBSTACK2')) { console.log(ind + ' [' + k + ']'); dump(v[1], ind + '   ', seen); }
  }
}
const seen = new Set();
let cur = interp.blocks[inIf].inputs.SUBSTACK[1];
let n = 0;
while (cur && n < 25) { dump(cur, ' ', seen); cur = interp.blocks[cur].next; n++; }
