'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
function findDef(pc){for(const [id,b] of Object.entries(B)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=B[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const prep=reach(findDef('prepare'));
const ors=[...prep].filter(id=>B[id].opcode==='operator_or');
console.log('operator_or blocks in prepare: '+ors.length);
const show=(d)=>{ if(!d) return 'none'; if(typeof d[1]==='string'){ const b=B[d[1]]; return b?b.opcode:'missing'; } return 'litarray:'+JSON.stringify(d).slice(0,60); };
let n=0;
for(const id of ors){
  const b=B[id]; const a=b.inputs.OPERAND1,c=b.inputs.OPERAND2;
  console.log('--- OR '+id+'  A='+show(a)+'  B='+show(c));
  for(const d of [a,c]){ if(d&&typeof d[1]==='string'&&B[d[1]]&&B[d[1]].opcode==='operator_equals'){ const e=B[d[1]]; console.log('      EQ '+JSON.stringify(e.inputs).slice(0,150)); } }
  if(++n>=3) break;
}