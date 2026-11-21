'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
for(const T of P.targets){
  const B2=T.blocks; const refs={};
  for(const id in B2){ const b=B2[id];
    const add=(c,how)=>{ if(c&&B2[c]) (refs[c]=refs[c]||[]).push(id+':'+how); };
    if(typeof b.next==='string') add(b.next,'next');
    for(const k in b.inputs){ const inp=b.inputs[k]; if(!Array.isArray(inp))continue; for(let i=1;i<inp.length;i++) if(typeof inp[i]==='string') add(inp[i],k); }
  }
  for(const [c,list] of Object.entries(refs)) if(list.length>1){
    console.log(T.name, c, B2[c].opcode, 'refs:', list.join(' | '));
    for(const r of list){ const rid=r.split(':')[0]; console.log('    from', rid, B2[rid].opcode, B2[rid].mutation?('<'+B2[rid].mutation.proccode+'>'):''); }
  }
}
