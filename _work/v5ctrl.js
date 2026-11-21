
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const t=p.targets.find(x=>x.name==='Controller'); const B=t.blocks;
const stage=p.targets.find(x=>x.isStage); const gId={}; for(const [id,v] of Object.entries(stage.variables||{})) gId[id]=v[0];
const vId={}; for(const [id,v] of Object.entries(t.variables||{})) vId[id]=v[0];
console.log('Controller vars:', JSON.stringify(Object.values(t.variables).map(v=>v[0])));
console.log('Controller costumes:', JSON.stringify(t.costumes.map(c=>c.name)));
// list hats
const tops=Object.keys(B).filter(id=>B[id].topLevel);
const hats={};
for(const id of tops){ const o=B[id].opcode; let k=o; if(o==='event_whenkeypressed') k='key:'+B[id].fields.KEY_OPTION[0]; if(o==='procedures_definition') k='DEF:'+B[B[id].inputs.custom_block[1]].mutation.proccode; hats[k]=(hats[k]||0)+1; }
console.log('Controller hats:', JSON.stringify(hats, null, 0));
// click procedure first 60 statements
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function slot(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;const v=i[1];
  if(typeof v==='string'&&B[v])return{kind:'block',id:v};(0);if(Array.isArray(v)&&PRIM.has(v[0]))return{kind:'lit',val:v[1]};return null;}
// simplified: just count how click decides
let clickId=null;
for(const id of tops){ const b=B[id]; if(b.opcode==='procedures_definition'){ const pr=B[b.inputs.custom_block[1]]; if(pr.mutation.proccode==='click') clickId=id; } }
console.log('click def id', clickId);
// count blocks and key structural ops inside click
const kids=(id)=>{const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const i=b.inputs[k];if(!i)continue;for(let x=1;x<i.length;x++){const v=i[x];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);};
const s=new Set(); const st=[clickId]; while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const c of kids(x)) st.push(c);}
const ops={}; for(const id of s) ops[B[id].opcode]=(ops[B[id].opcode]||0)+1;
console.log('click ops:', JSON.stringify(Object.entries(ops).sort((a,b)=>b[1]-a[1])));
