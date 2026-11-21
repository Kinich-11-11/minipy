'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
const igDef=findDef('indexget %s %s');
console.log('igDef',igDef,'next',t.blocks[igDef].next);
// count equals blocks mentioning xb
let n=0;
const seen=new Set(); const stack=[t.blocks[igDef].next];
while(stack.length){const id=stack.pop(); if(!id||seen.has(id))continue; seen.add(id); const b=t.blocks[id]; if(!b)continue;
  if(b.opcode==='operator_equals'){
    n++;
    const o1=b.inputs.OPERAND1, o2=b.inputs.OPERAND2;
    const b1=o1&&typeof o1[1]==='string'?t.blocks[o1[1]]:null;
    console.log('eq',id,'op1',b1?b1.opcode+'/'+(b1.fields&&b1.fields.VARIABLE?b1.fields.VARIABLE[0]:''):JSON.stringify(o1),'op2',JSON.stringify(o2));
  }
  if(b.next)stack.push(b.next);
  for(const v of Object.values(b.inputs||{})){ if(!Array.isArray(v))continue; for(let i=1;i<v.length;i++) if(typeof v[i]==='string') stack.push(v[i]); }
}
console.log('equals total',n);
