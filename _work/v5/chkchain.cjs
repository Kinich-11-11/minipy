const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const B = t.blocks;
const has = (id, needle) => JSON.stringify(B[id] && B[id].inputs || {}).indexOf(needle) >= 0;
let start = null;
for (const id in B) if (has(id, 'BINDBG') && B[id].opcode === 'data_addtolist') { start = id; break; }
console.log('start:', start);
function depth(id) { let n = 0, cur = B[id] && B[id].parent, g = 0; while (cur && g++ < 200) { if (B[cur].opcode.indexOf('control_if') === 0) n++; cur = B[cur].parent; } return n; }
let cur = start, g = 0;
while (cur && g++ < 40) {
  const b = B[cur];
  const mark = has(cur, 'PCTBRANCH') ? ' <== PCTBRANCH' : (has(cur, 'BEFORE%') ? ' <== BEFORE%' : '');
  console.log('  ' + b.opcode + ' ifDepth=' + depth(cur) + mark);
  cur = b.next;
}