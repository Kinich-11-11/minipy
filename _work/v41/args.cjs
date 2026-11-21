
const fs=require('fs');
const BL=P=>P;
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const B2=P.targets.find(t=>t.name==='Interpreter').blocks;
const want=process.argv.slice(2);
for(const id of Object.keys(B2)){ const b=B2[id]; if(b.opcode!=='procedures_definition')continue;
  const p=B2[b.inputs.custom_block[1]]; if(!p||!p.mutation)continue;
  const pc=p.mutation.proccode;
  if(want.length && !want.some(w=>pc.startsWith(w))) continue;
  console.log(pc, '| args=', p.mutation.argumentnames, '| ids=', p.mutation.argumentids, '| warp=', p.mutation.warp);
}
