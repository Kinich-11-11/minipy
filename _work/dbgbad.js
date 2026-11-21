
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const t = p.targets[3];
const b = t.blocks['bdatait_13vlob6v1'];
console.log(JSON.stringify(b));
// find all data_itemoflist blocks whose INDEX input is not a valid array
let bad = 0;
for (const [id, blk] of Object.entries(t.blocks)) {
  if (blk.opcode !== 'data_itemoflist') continue;
  const idx = blk.inputs.INDEX;
  if (!Array.isArray(idx)) { bad++; console.log('BAD', id, JSON.stringify(idx), 'parent=', blk.parent); }
}
console.log('bad itemoflist blocks:', bad);
