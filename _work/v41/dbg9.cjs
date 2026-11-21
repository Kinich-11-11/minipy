const fs=require('fs');
const {zipRead}=require('../sb3lib.js');
const P=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.10.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
const stage=P.targets.find(x=>x.isStage);
const names=new Map();
for(const [id,v] of Object.entries(stage.variables||{})) names.set(id,v[0]);
for(const [id,v] of Object.entries(t.variables||{})) names.set(id,v[0]);
const saved=[];
for(const id of reach(defIdOf('fpush'))){const b=B[id];
  if(b.opcode==='data_addtolist'&&b.fields.LIST[0]==='VSave'){const v=b.inputs.ITEM[1]; if(Array.isArray(v)&&v[0]===12) saved.push(names.get(v[2])+' [stage='+!!stage.variables[v[2]]+']'); else saved.push('?');}
}
console.log('fpush saves '+saved.length+' vars');
console.log(saved.join(','));
