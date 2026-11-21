
const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v5test/';
const files=['cases.json','cases_diff.json','cases_probe2.json','cases_probe3.json'];
const all=[]; const seen=new Set();
for(const f of files){ const c=JSON.parse(fs.readFileSync(dir+f,'utf8'));
  for(const x of c){ if(seen.has(x.name)) continue; seen.add(x.name); all.push({name:x.name, code:x.code, inputs:x.inputs}); } }
fs.writeFileSync(dir+'cases_all.json', JSON.stringify(all,null,1));
console.log('regression suite cases:', all.length);
