
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const hat = Object.entries(interp.blocks).find(([id, b]) => b.topLevel && b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION[0] === 'RUN')[0];
// find the repeat_until of the run loop
function dump(id, ind, depth) {
  if (!id || depth > 4) return;
  const b = interp.blocks[id];
  if (!b) { console.log(ind + '<?' + id + '>'); return; }
  console.log(ind + b.opcode + ' ' + JSON.stringify(b.fields) + ' next=' + b.next + ' parent=' + b.parent);
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string' && interp.blocks[v[1]]) {
      console.log(ind + ' [' + k + ']');
      dump(v[1], ind + '   ', depth + 1);
    }
  }
}
console.log('=== run loop tail ===');
let cur = interp.blocks[hat].next;   // repeat_until
const rep = interp.blocks[cur];
const sub = rep.inputs.SUBSTACK[1];
let n = sub, count = 0;
while (n && count < 6) { dump(n, ' ', 0); n = interp.blocks[n].next; count++; }
console.log('=== tail of that chain ===');
let last = sub; while (interp.blocks[last].next) last = interp.blocks[last].next;
dump(last, ' ', 0);
