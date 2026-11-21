const fs=require('fs');
const {zipRead}=require('../sb3lib.js');
const project=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t=project.targets.find(t=>t.name==='Interpreter'); const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw new Error('nf '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const d=defIdOf('pair %s %s %s %s');
const ids=[...reach(d)];
console.log('pair blocks',ids.length);
for(const id of ids){const b=B[id]; if(b.opcode==='control_if_else'||b.opcode==='control_if'||b.opcode==='procedures_call'){console.log(id,b.opcode, b.mutation?b.mutation.proccode:'', JSON.stringify(b.inputs).slice(0,200));}}
