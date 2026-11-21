
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.topLevel && b.opcode === 'event_whenkeypressed' && ['up arrow', 'down arrow'].includes(b.fields.KEY_OPTION[0])) {
    console.log('=== HAT', b.fields.KEY_OPTION[0], id);
    let cur = b.next, n = 0;
    while (cur && n < 20) {
      const blk = ctrl.blocks[cur];
      let extra = '';
      if (blk.inputs.CONDITION) {
        const cid = blk.inputs.CONDITION[1];
        const cb = ctrl.blocks[cid];
        extra = ' cond=' + cid + ' ' + cb.opcode + ' O1=' + JSON.stringify(cb.inputs.OPERAND1) + ' O2=' + JSON.stringify(cb.inputs.OPERAND2) + ' condparent=' + cb.parent;
      }
      console.log('  ', cur, blk.opcode, JSON.stringify(blk.fields).slice(0, 60), 'next=' + blk.next, 'parent=' + blk.parent, extra);
      cur = blk.next; n++;
    }
  }
}
// who references the shared conditions?
const refs = {};
for (const [id, b] of Object.entries(ctrl.blocks)) {
  for (const [slot, inp] of Object.entries(b.inputs || {})) {
    if (Array.isArray(inp) && typeof inp[1] === 'string') { (refs[inp[1]] = refs[inp[1]] || []).push(id + '.' + slot); }
  }
}
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'operator_and' && refs[id] && refs[id].length > 1) console.log('SHARED condition', id, 'referenced by', refs[id].join(' , '));
}
