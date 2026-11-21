
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(t=>t.name==='Interpreter'); const B=it.blocks;
for(const id in B){ const b=B[id]; if(b&&(b.opcode==='control_wait'||b.opcode==='control_stop')) console.log(b.opcode, id, 'parent', b.parent, B[b.parent]?B[b.parent].opcode:'-'); }
// find owning script of the wait
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const i=b.inputs[k];if(!i)continue;for(let x=1;x<i.length;x++){const v=i[x];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
const roots=Object.keys(B).filter(id=>B[id].topLevel);
for(const r of roots){ const s=new Set(); const st=[r]; while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const c of kids(x)) st.push(c);}
  for(const id of s){ if(B[id].opcode==='control_wait'||B[id].opcode==='control_stop'){ const proto=B[r].inputs.custom_block?B[B[r].inputs.custom_block[1]].mutation.proccode:B[r].opcode; console.log('  '+B[id].opcode+' inside '+proto); } } }
// also dump names of stage lists and interpreter list count
console.log('stage lists:', JSON.stringify(Object.values(p.targets.find(t=>t.isStage).lists).map(l=>l[0])));
