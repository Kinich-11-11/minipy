
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
function ownerOf(blockId) {
  let cur = blockId, hops = 0;
  while (cur && hops++ < 500) {
    const b = interp.blocks[cur];
    if (!b) return '?';
    if (b.opcode === 'procedures_definition') {
      const proto = interp.blocks[b.inputs.custom_block[1]];
      return proto ? proto.mutation.proccode : 'def?';
    }
    cur = b.parent;
  }
  return 'top';
}
for (const name of ['tmp', 'found', 'si', 'cmp', 'ev']) {
  const writers = [];
  for (const [id, b] of Object.entries(interp.blocks)) {
    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === name) writers.push(ownerOf(id));
    if (b.opcode === 'data_changevariableby' && b.fields.VARIABLE && b.fields.VARIABLE[0] === name) writers.push(ownerOf(id) + '(chg)');
  }
  console.log(name, 'written by:', JSON.stringify([...new Set(writers)]));
}
