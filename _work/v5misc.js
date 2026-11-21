
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const B = {}; for(const t of p.targets){ B[t.name]=t.blocks; }
const it=p.targets.find(t=>t.name==='Interpreter');
console.log('stage broadcasts:', JSON.stringify(p.targets.find(t=>t.isStage).broadcasts));
// Reg list usage
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
const listIds=new Map(); for(const [id,v] of Object.entries(it.lists)) listIds.set(id,v[0]);
const use={};
for(const id in it.blocks){ const b=it.blocks[id]; if(!b||!b.opcode)continue;
  for(const k in (b.fields||{})){ const f=b.fields[k]; if(!f)continue;
    if(/^(LIST|VARIABLE)$/.test(k)){ const nm=listIds.get(f[1]); if(nm) use[nm]=(use[nm]||0)+1; } } }
const reg = use['Reg']; console.log('Reg list usage count in Interpreter:', reg);
const zero=[...listIds.values()].filter(n=>!use[n]); console.log('declared lists never referenced:', JSON.stringify(zero));
// which lists referenced most
console.log('top lists by refs:', Object.entries(use).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+':'+v).join(' '));
// the RUN hat structure
const root='v5even5n';
function inp(id,n){const b=B.Interpreter[id];const i=b.inputs[n];if(!i)return null;for(let x=1;x<i.length;x++){const v=i[x];if(typeof v==='string'&&B.Interpreter[v])return v;if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B.Interpreter[v[1]])return v[1];}return null;}
const hat=B.Interpreter[root];
console.log('RUN hat opcode:', hat.opcode, 'fields', JSON.stringify(hat.fields));
let cur=hat.next; const seq=[];
while(cur){ const b=B.Interpreter[cur]; if(!b)break; seq.push(b.opcode+(b.opcode==='procedures_call'?('('+b.mutation.proccode+')'):'')); cur=b.next; }
console.log('RUN hat body chain:', seq.join(' -> '));
