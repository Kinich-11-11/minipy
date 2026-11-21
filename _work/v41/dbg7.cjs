const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defOf(id){let cur=id,g=0;while(cur&&g++<400){const b=B[cur];if(b.opcode==='procedures_definition'){const pr=B[b.inputs.custom_block[1]];return pr?pr.mutation.proccode:'?';}cur=b.parent;}return '(top)';}
for(const id in B){const b=B[id];
  const f=b.fields&&b.fields.VARIABLE;
  if(f&&f[0]==='cdepth') console.log(b.opcode,'in',defOf(id),'val',JSON.stringify(b.inputs&&b.inputs.VALUE?b.inputs.VALUE[1]:null));
  for(const v of Object.values(b.inputs||{})) if(Array.isArray(v[1])&&v[1][0]===12&&v[1][1]==='cdepth') console.log('REF',b.opcode,'in',defOf(id),'slot?');
}
