const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const names=[]; for(const t of P.targets){ for(const v of Object.values(t.variables||{})) names.push(v[0]); for(const v of Object.values(t.lists||{})) names.push(v[0]); }
const uniq=[...new Set(names)];
for(const w of ['xi','xj','xjc','xjd','xjs','xjb','xjk','xjch','New2']) console.log(w, uniq.includes(w)?'TAKEN':'free');
