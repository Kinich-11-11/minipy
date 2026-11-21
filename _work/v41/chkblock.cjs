'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Controller'); const B=t.blocks;
for (const id of ['boperat_54l2mj8vu','bargume_54eeekt26']) {
  const b=B[id];
  console.log('--- '+id+' '+JSON.stringify(b).slice(0,300));
  const parents=Object.entries(B).filter(([k,v])=>Object.values(v.inputs||{}).some(x=>x&&x[1]===id) || v.next===id).map(([k,v])=>k+':'+v.opcode);
  console.log('   referenced by: '+JSON.stringify(parents));
}