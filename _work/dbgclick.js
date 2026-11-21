
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
let clickDef = null;
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
    const proto = ctrl.blocks[b.inputs.custom_block[1]];
    if (proto && proto.mutation.proccode === 'click') clickDef = id;
  }
}
console.log('click def', clickDef);
function refsVar(blockId, name, depth) {
  if (!blockId || depth > 8) return false;
  const b = ctrl.blocks[blockId]; if (!b) return false;
  for (const inp of Object.values(b.inputs || {})) {
    if (!Array.isArray(inp)) continue;
    if (Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === name) return true;
    if (typeof inp[1] === 'string' && refsVar(inp[1], name, depth + 1)) return true;
  }
  return false;
}
let id = ctrl.blocks[clickDef].next, n = 0;
while (id && n < 12) {
  const b = ctrl.blocks[id];
  console.log(n, id, b.opcode, 'busyRef=' + (b.inputs.CONDITION ? refsVar(b.inputs.CONDITION[1], 'busy', 0) : '-'), 'sub=' + JSON.stringify(b.inputs.SUBSTACK), 'next=' + b.next);
  id = b.next; n++;
}
// look for editLine calls
for (const [bid, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'procedures_call' && b.mutation.proccode === 'editLine') console.log('editLine call at', bid, 'parent=', b.parent);
}
// look for the gutter branch (operator_gt uy -118)
for (const [bid, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
    const c = ctrl.blocks[b.inputs.CONDITION[1]];
    if (c && c.opcode === 'operator_and') console.log('and-if', bid, 'parent=', b.parent, 'sub=', JSON.stringify(b.inputs.SUBSTACK));
  }
}
