'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
const groups={};
const raw=[];
for(const [id,b] of Object.entries(B)){
  if(b.opcode!=='operator_or') continue;
  const A=b.inputs.OPERAND1,Bb=b.inputs.OPERAND2;
  const key=(d)=>{ if(!d) return 'none'; if(typeof d[1]==='string'){ const bb=B[d[1]]; if(!bb) return 'missing'; if(bb.opcode==='operator_equals'){ const o1=bb.inputs.OPERAND1,o2=bb.inputs.OPERAND2; const lit=(x)=>Array.isArray(x&&x[1])?JSON.stringify(x[1]):(x&&typeof x[1]==='string'?('blk:'+((B[x[1]]||{}).opcode||'?')):'?'); return 'eq('+lit(o1)+'=='+lit(o2)+')'; } return bb.opcode; } return 'lit:'+JSON.stringify(d[1]); };
  const k=key(A)+' | '+key(Bb);
  groups[k]=(groups[k]||0)+1;
  if(raw.length<8 && k.includes('"("')===false && k.includes('"["')===false && (k.includes('(')||k.includes('['))) raw.push(id+' '+k);
}
const sorted=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
for(const [k,v] of sorted.slice(0,14)) console.log(v+'  '+k);
console.log('--- samples ---');
console.log(raw.join('\n'));