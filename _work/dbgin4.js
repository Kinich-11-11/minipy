
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const scan = interp.blocks['bcontro_t5pm81og'];
console.log('scan cond =', JSON.stringify(scan.inputs.CONDITION));
console.log('scan sub =', JSON.stringify(scan.inputs.SUBSTACK));
function tree(id, ind, depth) {
  if (!id || depth > 6) return;
  const b = interp.blocks[id];
  if (!b) { console.log(ind + '<?' + id); return; }
  console.log(ind + b.opcode + ' ' + JSON.stringify(b.fields).slice(0, 50));
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string' && k !== 'SUBSTACK' && k !== 'SUBSTACK2') { console.log(ind + ' ' + k + ':'); tree(v[1], ind + '   ', depth + 1); }
  }
}
console.log('--- condition tree ---');
tree(scan.inputs.CONDITION[1], ' ', 0);
console.log('--- body chain ---');
let cur = scan.inputs.SUBSTACK[1], n = 0;
while (cur && n < 8) { const b = interp.blocks[cur]; console.log(n, cur, b.opcode, JSON.stringify(b.fields).slice(0, 60), 'next=', JSON.stringify(b.next), 'inputs=', JSON.stringify(Object.keys(b.inputs))); cur = b.next; n++; }
