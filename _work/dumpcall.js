'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
// find calls to callfn inside eval
const evalDef=findDef('eval %s %s');
const seen=new Set(); const stack=[t.blocks[evalDef].next];
const calls=[];
while(stack.length){const id=stack.pop(); if(!id||seen.has(id))continue; seen.add(id); const b=t.blocks[id]; if(!b)continue;
  if(b.opcode==='procedures_call'&&b.mutation.proccode.startsWith('callfn')) calls.push(id);
  if(b.next)stack.push(b.next);
  for(const v of Object.values(b.inputs||{})){ if(!Array.isArray(v))continue; for(let i=1;i<v.length;i++) if(typeof v[i]==='string') stack.push(v[i]); }
}
console.log('callfn calls in eval:',calls.length);
for(const cid of calls){
  let id=cid, depth=0;
  while(id&&depth<8){const b=t.blocks[id];console.log('  '.repeat(depth)+id+' '+b.opcode+(b.mutation?' <'+b.mutation.proccode+'>':''));id=b.parent;depth++;}
  const b=t.blocks[cid];
  console.log('   ARGS:',Object.entries(b.inputs).map(([k,v])=>k+'='+(Array.isArray(v[1])?JSON.stringify(v[1]):v[1])).join(' '));
}
