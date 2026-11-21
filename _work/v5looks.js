
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(t=>t.name==='Interpreter');
const ops={}; for(const id in it.blocks){const b=it.blocks[id]; if(b&&b.opcode) ops[b.opcode]=(ops[b.opcode]||0)+1;}
console.log('Interpreter looks opcodes:', JSON.stringify(Object.entries(ops).filter(([k])=>k.startsWith('looks')).sort((a,b)=>b[1]-a[1])));
console.log('Interpreter sensing:', JSON.stringify(Object.entries(ops).filter(([k])=>k.startsWith('sensing'))));
console.log('Interpreter event:', JSON.stringify(Object.entries(ops).filter(([k])=>k.startsWith('event'))));
console.log('Interpreter control:', JSON.stringify(Object.entries(ops).filter(([k])=>k.startsWith('control')).sort((a,b)=>b[1]-a[1])));
console.log('Interpreter operator:', JSON.stringify(Object.entries(ops).filter(([k])=>k.startsWith('operator')).sort((a,b)=>b[1]-a[1])));
// which scripts use looks
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(B,id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const inp=b.inputs[k];if(!inp)continue;for(let i=1;i<inp.length;i++){const v=inp[i];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
const B=it.blocks;
for(const root of ['v5def5d','v5def57','v5even5n']){
  const s=new Set(); const st=[root]; while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const c of kids(B,x)) st.push(c);}
  const lo={}; for(const id of s){ const o=B[id].opcode; if(o.startsWith('looks')) lo[o]=(lo[o]||0)+1; }
  console.log(root+' looks blocks:', JSON.stringify(lo));
}
