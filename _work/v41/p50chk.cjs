'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
const descOf=(d)=>(d&&typeof d[1]==='string')?{kind:'block',id:d[1]}:(d&&Array.isArray(d[1])?{kind:'lit',code:d[1][0],value:d[1][1]}:null);
const blkOf=(d)=>{const r=descOf(d);return r&&r.kind==='block'?B[r.id]:null;};
const litOf=(d)=>{const r=descOf(d);return r&&r.kind==='lit'&&(r.code===10||r.code===4)?String(r.value):null;};
const match=(b)=>{
  if(b.opcode!=='operator_or')return null;
  const A=b.inputs&&b.inputs.OPERAND1,Bb=b.inputs&&b.inputs.OPERAND2; if(!A||!Bb)return null;
  const ea=blkOf(A),eb=blkOf(Bb); if(!ea||!eb)return null;
  if(ea.opcode!=='operator_equals'||eb.opcode!=='operator_equals')return null;
  const a1=litOf(ea.inputs.OPERAND2),b1=litOf(eb.inputs.OPERAND2);
  if((a1==='(' &&b1==='[')||(a1==='['&&b1==='(')) return 'open';
  if((a1===')' &&b1===']')||(a1===']'&&b1===')')) return 'close';
  return null;
};
let open=0,close=0; const samples=[];
for(const [id,b] of Object.entries(B)){ const m=match(b); if(m){ if(m==='open')open++; else close++; if(samples.length<6) samples.push(id+' '+m); } }
console.log('matching ORs left: open='+open+' close='+close);
console.log(samples.join('\n'));