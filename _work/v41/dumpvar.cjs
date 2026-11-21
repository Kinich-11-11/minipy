'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v424.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
for (const [id,v] of Object.entries(t.variables||{})) { if (['lsep','lesc1'].includes(v[0])) console.log(id, JSON.stringify(v)); }
const st=P.targets.find(x=>x.isStage);
for (const [id,v] of Object.entries(st.variables||{})) { if (['lsep','lesc1'].includes(v[0])) console.log('stage', id, JSON.stringify(v)); }