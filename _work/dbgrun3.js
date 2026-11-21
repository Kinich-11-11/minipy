
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const hat = Object.entries(interp.blocks).find(([id, b]) => b.topLevel && b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION[0] === 'RUN')[0];
let cur = interp.blocks[hat].next, guard = null;
while (cur) {
  const b = interp.blocks[cur];
  if (b.opcode === 'control_repeat_until') guard = cur;
  cur = b.next;
}
console.log('repeat_until', guard);
const rep = interp.blocks[guard];
const sub = rep.inputs.SUBSTACK[1];
let n = sub, count = 0;
while (n && count < 20) {
  const b = interp.blocks[n];
  console.log(' ', n, b.opcode, JSON.stringify(b.fields).slice(0, 40), 'next=' + b.next, 'parent=' + b.parent, 'cond=' + (b.inputs.CONDITION ? JSON.stringify(b.inputs.CONDITION) : '-'), 'sub=' + (b.inputs.SUBSTACK ? JSON.stringify(b.inputs.SUBSTACK) : '-'));
  if (b.inputs.SUBSTACK && interp.blocks[b.inputs.SUBSTACK[1]]) {
    let s2 = b.inputs.SUBSTACK[1], c2 = 0;
    while (s2 && c2 < 6) { const bb = interp.blocks[s2]; console.log('     >', s2, bb.opcode, JSON.stringify(bb.fields).slice(0, 30), 'cond=' + (bb.inputs.CONDITION ? JSON.stringify(bb.inputs.CONDITION) : '-'), 'next=' + bb.next, 'parent=' + bb.parent); if (bb.inputs.SUBSTACK && interp.blocks[bb.inputs.SUBSTACK[1]]) { const bb2 = interp.blocks[bb.inputs.SUBSTACK[1]]; console.log('         >>', bb.inputs.SUBSTACK[1], bb2.opcode, JSON.stringify(bb2.fields).slice(0,30), 'next=' + bb2.next, 'parent=' + bb2.parent); } s2 = bb.next; c2++; }
  }
  n = b.next; count++;
}
