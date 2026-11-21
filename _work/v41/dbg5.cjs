const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
// use the pristine v4 project for inspection
const {zipRead}=require('../sb3lib.js');
const Q=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const tt=Q.targets.find(x=>x.name==='Interpreter');const C=tt.blocks;
function defId2(pc){for(const id in C){const b=C[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=C[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach2(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=C[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
for(const id of reach2(defId2('indexget %s %s'))){const b=C[id];if(b.opcode==='procedures_call'&&b.mutation.proccode==='substr %s %s %s'){console.log('SUBSTR',id,JSON.stringify(b.inputs));}}
