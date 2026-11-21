const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead('MiniPy_v5.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Controller');
const b = t.blocks['boperat_v6whojyt'];
console.log('op =', b && b.opcode, JSON.stringify(b && b.fields), JSON.stringify(b && b.inputs));
for (const k in (b.inputs||{})) { const v = b.inputs[k]; if (Array.isArray(v) && typeof v[1] === 'string' && t.blocks[v[1]]) console.log('  in ' + k + ' -> ' + t.blocks[v[1]].opcode + ' ' + JSON.stringify(t.blocks[v[1]].fields)); }