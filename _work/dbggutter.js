
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
function containsNum(blockId, val, depth) {
  if (!blockId || depth > 10) return false;
  const b = ctrl.blocks[blockId]; if (!b) return false;
  for (const inp of Object.values(b.inputs || {})) {
    if (!Array.isArray(inp)) continue;
    if (Array.isArray(inp[1]) && String(inp[1][1]) === String(val)) return true;
    if (typeof inp[1] === 'string' && containsNum(inp[1], val, depth + 1)) return true;
  }
  return false;
}
// who references the editLine call?
const ed = Object.entries(ctrl.blocks).filter(([id, b]) => b.opcode === 'procedures_call' && b.mutation.proccode === 'editLine')[0];
console.log('editLine call', ed && ed[0], 'parent', ed && ed[1].parent, 'grandparent', ed && ctrl.blocks[ed[1].parent] && ctrl.blocks[ed[1].parent].parent);
if (ed) {
  let id = ed[0];
  const chain = [];
  let cur = ed[1].parent, hops = 0;
  while (cur && hops++ < 12) { const b = ctrl.blocks[cur]; chain.push(cur + ' ' + b.opcode + ' sub=' + JSON.stringify(b.inputs.SUBSTACK || b.inputs.SUBSTACK2) + ' cond=' + JSON.stringify(b.inputs.CONDITION)); cur = b.parent; }
  console.log('ancestors:\n  ' + chain.join('\n  '));
}
// which control_if has a condition mentioning -206 (gutter)?
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] && containsNum(b.inputs.CONDITION[1], -206, 0)) {
    console.log('gutter if', id, 'parent=', b.parent, 'sub=', JSON.stringify(b.inputs.SUBSTACK), 'next=', b.next, 'parentOp=', ctrl.blocks[b.parent] && ctrl.blocks[b.parent].opcode);
  }
}
// is lastclick referenced?
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.fields && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'lastclick') console.log('lastclick used by', id, b.opcode, 'parent', b.parent);
}
