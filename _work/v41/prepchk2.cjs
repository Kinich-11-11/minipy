'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
function findDef(pc){for(const [id,b] of Object.entries(B)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=B[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const prep=reach(findDef('prepare'));
const litOf=(d)=>{ if(!d) return null; if(Array.isArray(d)&&(d[0]===10||d[0]===4)&&typeof d[1]!=='object') return String(d[1]); if(Array.isArray(d[1])&&(d[1][0]===10||d[1][0]===4)) return String(d[1][1]); return null; };
const eqs=[...prep].filter(id=>B[id].opcode==='operator_equals');
console.log('equals in prepare: '+eqs.length);
let shown=0;
for(const id of eqs){
  const b=B[id]; const l=litOf(b.inputs.OPERAND2) ?? litOf(b.inputs.OPERAND1);
  if(!['def','if','while','for','else','elif'].includes(l)) continue;
  console.log(id+'  lit='+l+'  OP1='+JSON.stringify(b.inputs.OPERAND1).slice(0,90)+'  OP2='+JSON.stringify(b.inputs.OPERAND2).slice(0,60));
  if(++shown>=10) break;
}