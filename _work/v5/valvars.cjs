const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p=JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
for(const t of p.targets){
  for(const [id,v] of Object.entries(t.variables||{})){ if(typeof v[0]!=='string') console.log('BAD VAR', t.name, id, JSON.stringify(v).slice(0,80)); }
  for(const [id,v] of Object.entries(t.lists||{})){ if(typeof v[0]!=='string') console.log('BAD LIST', t.name, id, JSON.stringify(v).slice(0,80)); }
}
console.log('scan done');