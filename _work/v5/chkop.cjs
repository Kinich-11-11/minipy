const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const byId = t.blocks;
const ops = new Set();
function scan(v) {
  if (Array.isArray(v)) { if (v.length === 2 && v[0] === 10 && typeof v[1] === 'string' && /^[A-Z]+$/.test(v[1])) ops.add(v[1]); for (const x of v) scan(x); }
  else if (v && typeof v === 'object') for (const k in v) scan(v[k]);
}
for (const id in byId) scan(byId[id].inputs);
console.log('opcode literals:', [...ops].sort().join(' '));