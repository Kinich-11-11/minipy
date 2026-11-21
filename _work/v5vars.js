
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const t=p.targets.find(x=>x.name==='Interpreter');
const names=Object.values(t.variables||{}).map(v=>v[0]);
const reg=names.filter(n=>/^v5reg/.test(n));
const other=names.filter(n=>!/^v5reg/.test(n));
console.log('total vars:',names.length,'| v5reg*:',reg.length,'| other:',other.length);
console.log('other:',other.join(' '));
const regNums=reg.map(n=>Number(n.replace('v5regP',''))).sort((a,b)=>a-b);
console.log('reg range:', regNums[0], '..', regNums[regNums.length-1], 'count', regNums.length);
const missing=[]; for(let i=0;i<=regNums[regNums.length-1];i++) if(!regNums.includes(i)) missing.push(i);
console.log('missing register numbers:', missing.join(','));
// Reg list content
const regList=Object.values(t.lists||{}).find(l=>l[0]==='Reg');
console.log('Reg list:', JSON.stringify(regList[1]));
// globals of stage and their usage in Interpreter
const stage=p.targets.find(x=>x.isStage);
const gNames=Object.values(stage.variables||{}).map(v=>v[0]);
console.log('stage globals:', gNames.join(' '));
// count references to stage globals in Interpreter via fields (approx: variable names appearing as fields with global id)
const gIds=new Set(Object.keys(stage.variables||{}));
let refs={};
for(const id in t.blocks){ const b=t.blocks[id]; if(!b||!b.opcode)continue;
  for(const k in (b.fields||{})){ const f=b.fields[k]; if(f&&gIds.has(f[1])) refs[f[0]]=refs[f[0]]||0, refs[f[0]]++; } }
console.log('global refs in Interpreter:', JSON.stringify(refs));
