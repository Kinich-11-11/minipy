
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(t=>t.name==='Interpreter'); const B=it.blocks;
const stage=p.targets.find(t=>t.isStage); const gIds={}; for(const [id,v] of Object.entries(stage.variables)) gIds[id]=v[0];
for(const id in B){ const b=B[id]; if(!b)continue;
  const f=b.fields&&b.fields.VARIABLE;
  if(f && (f[0]==='speed')){ console.log('speed ref:', b.opcode, id, 'parent:', b.parent, B[b.parent]?B[b.parent].opcode:'-'); }
}
// print the whole enclosing script of each speed ref: walk to top-level
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function topOf(id){ let c=id; while(c && B[c] && B[c].parent) c=B[c].parent; return c; }
for(const id in B){ const b=B[id]; if(!b)continue; const f=b.fields&&b.fields.VARIABLE;
  if(f&&f[0]==='speed'){ const t=topOf(id); const b0=B[t]; const proto=b0.inputs&&b0.inputs.custom_block?B[b0.inputs.custom_block[1]].mutation.proccode:'(hat) '+b0.opcode; console.log('  -> in', proto); } }
