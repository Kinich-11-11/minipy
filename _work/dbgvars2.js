'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const names=['ev','lacc','yb','yr','li','lstart','lcount','evtype','ltmp','lsum'];
for(const T of P.targets){
  for(const [id,v] of Object.entries(T.variables||{})) if(names.includes(v[0])) console.log('VAR', T.name, v[0], id);
  for(const [id,v] of Object.entries(T.lists||{})) if(names.includes(v[0])) console.log('LIST', T.name, v[0], id);
}
const t=P.targets.find(x=>x.name==='Interpreter');
// find the substr call inside listitem
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
const liDef=findDef('listitem %s %s');
const seen=new Set(); const stack=[t.blocks[liDef].next];
while(stack.length){const id=stack.pop(); if(!id||seen.has(id))continue; seen.add(id); const b=t.blocks[id]; if(!b)continue;
  if(b.opcode==='procedures_call'&&b.mutation.proccode==='substr %s %s %s'){
    console.log('substr call', id);
    const argIds=JSON.parse(b.mutation.argumentids);
    for(const aid of argIds){
      const inp=b.inputs[aid];
      console.log('   arg', aid, JSON.stringify(inp));
    }
  }
  if(b.next)stack.push(b.next);
  for(const v of Object.values(b.inputs||{})){ if(!Array.isArray(v))continue; for(let i=1;i<v.length;i++) if(typeof v[i]==='string') stack.push(v[i]); }
}
// also: what does the listitem def's argument 's' report?
console.log('--- listitem prototype reporters ---');
