
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const b = interp.blocks['bdatase_thwjeh3j'];
console.log('set-tmp', JSON.stringify(b.fields), 'next=', JSON.stringify(b.next), 'parent=', b.parent);
// print every block whose id starts with bdatase_th / bcontro_tws etc.
for (const id of ['bdatase_thwjeh3j']) {
  let cur = id, n = 0;
  while (cur && n < 12) { const x = interp.blocks[cur]; console.log(n, cur, x.opcode, JSON.stringify(x.fields).slice(0,40), 'next=', JSON.stringify(x.next)); cur = x.next; n++; }
}
// variables: is si declared?
console.log('Interpreter vars with si:', Object.entries(interp.variables).filter(([id, v]) => v[0] === 'si'));
console.log('stage vars tmp:', Object.entries(p.targets.find(t=>t.isStage).variables).filter(([id, v]) => v[0] === 'tmp' || v[0] === 'found' || v[0] === 'si').map(([id,v]) => v[0]+'@'+id));
