'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function litText(inp){ return (Array.isArray(inp)&&Array.isArray(inp[1])&&typeof inp[1][1]==='string')?inp[1][1]:null; }
for(const [id,b] of Object.entries(t.blocks)){
  if(b.opcode==='procedures_call'&&b.mutation.proccode==='fail %s'){
    const args=Object.entries(b.inputs).map(([k,v])=>litText(v)).filter(Boolean);
    for(const a of args){
      if(a.includes('unsupported statement')) console.log('FAILSITE', id, JSON.stringify(a), 'parent', b.parent, t.blocks[b.parent]&&t.blocks[b.parent].opcode);
    }
  }
}
