const fs=require('fs');
const {zipRead}=require('../sb3lib.js');
const P=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.10.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
console.log('Interpreter lists:', Object.values(t.lists||{}).map(x=>x[0]).join(','));
// which procedures reference UArgV?
const refs=[];
for(const id in B){const b=B[id]; if(b.fields&&b.fields.LIST&&b.fields.LIST[0]==='UArgV') refs.push(id);}
console.log('UArgV refs:',refs.length);
function defOf(id){let cur=id,g=0;while(cur&&g++<400){const b=B[cur];if(b.opcode==='procedures_definition'){const pr=B[b.inputs.custom_block[1]];return pr?pr.mutation.proccode:'?';}cur=b.parent;}return '(top)';}
const procs=new Set(refs.map(defOf));
console.log('UArgV used by:',[...procs].join(' | '));
