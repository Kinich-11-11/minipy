
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
// 1) is the gutter double-click editor still there?
const ed = Object.entries(ctrl.blocks).filter(([id, b]) => b.opcode === 'procedures_call' && b.mutation.proccode === 'editLine');
console.log('editLine calls:', ed.length);
// 2) arrow key hats: ladder present?
for (const k of ['up arrow', 'down arrow']) {
  const hat = Object.entries(ctrl.blocks).find(([id, b]) => b.topLevel && b.opcode === 'event_whenkeypressed' && b.fields.KEY_OPTION[0] === k);
  if (!hat) { console.log(k, 'HAT MISSING'); continue; }
  let id = ctrl.blocks[hat[0]].next, n = 0, ops = [];
  while (id && n < 6) { const b = ctrl.blocks[id]; ops.push(b.opcode); id = b.next; n++; }
  console.log(k, '->', ops.join(' -> '));
}
// 3) the click proc chain (top level)
let clickDef = null;
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = ctrl.blocks[b.inputs.custom_block[1]]; if (pr && pr.mutation.proccode === 'click') clickDef = id; }
}
let id = ctrl.blocks[clickDef].next, n = 0;
while (id && n < 8) { const b = ctrl.blocks[id]; console.log('click chain', n, id, b.opcode, 'cond=', JSON.stringify(b.inputs.CONDITION).slice(0, 40), 'next=', b.next); id = b.next; n++; }
