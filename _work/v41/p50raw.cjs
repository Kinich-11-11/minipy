'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
// find operator_or whose operands are operator_equals with chOf '(' and '['
const chOf=(d)=>{ if(!d||typeof d!=='object') return null; if(Array.isArray(d)&&(d[0]===10||d[0]===4)&&typeof d[1]==='string') return String(d[1]); if(Array.isArray(d[1])&&(d[1][0]===10||d[1][0]===4)) return String(d[1][1]); return null; };
const blkOf=(d)=>{ if(!d||typeof d[1]!=='string') return null; return B[d[1]]||null; };
let shown=0;
for(const [id,b] of Object.entries(B)){
  if(b.opcode!=='operator_or') continue;
  const A=b.inputs.OPERAND1,Bb=b.inputs.OPERAND2;
  const ea=blkOf(A),eb=blkOf(Bb);
  if(!ea||!eb||ea.opcode!=='operator_equals'||eb.opcode!=='operator_equals') continue;
  const a1=chOf(ea.inputs.OPERAND2),b1=chOf(eb.inputs.OPERAND2);
  if((a1==='('&&b1==='[')||(a1==='['&&b1==='(')){
    console.log('OR '+id+'  A='+JSON.stringify(A)+'  B='+JSON.stringify(Bb));
    console.log('  EA='+JSON.stringify(ea.inputs));
    console.log('  EB='+JSON.stringify(eb.inputs));
    if(++shown>=2) break;
  }
}