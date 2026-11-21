'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v426.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
function findDef(pc){for(const [id,b] of Object.entries(B)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=B[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const cu=reach(findDef('calluser %s %s %s'));
const gts=[...cu].filter(id=>B[id].opcode==='operator_gt');
console.log('gt blocks in calluser: '+gts.length);
for(const id of gts) console.log(id+' NUM1='+JSON.stringify(B[id].inputs.NUM1).slice(0,80)+'  NUM2='+JSON.stringify(B[id].inputs.NUM2).slice(0,80));
const rts=[...cu].filter(id=>B[id].opcode==='control_repeat_until');
console.log('repeat_until blocks: '+rts.length);
for(const id of rts) console.log(id+' COND='+JSON.stringify(B[id].inputs.CONDITION).slice(0,120));