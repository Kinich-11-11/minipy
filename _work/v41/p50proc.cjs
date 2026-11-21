'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v425.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
const chOf=(d)=>{ if(!d||typeof d!=='object') return null; if(Array.isArray(d)&&(d[0]===10||d[0]===4)&&typeof d[1]==='string') return String(d[1]); if(Array.isArray(d[1])&&(d[1][0]===10||d[1][0]===4)) return String(d[1][1]); return null; };
const blkOf=(d)=>{ if(!d||typeof d[1]!=='string') return null; return B[d[1]]||null; };
const eqChars=(desc)=>{ const b=blkOf(desc); if(!b||b.opcode!=='operator_equals') return null; const c2=chOf(b.inputs.OPERAND2); if(c2!==null) return {x:b.inputs.OPERAND1,ch:c2}; const c1=chOf(b.inputs.OPERAND1); if(c1!==null) return {x:b.inputs.OPERAND2,ch:c1}; return null; };
const defName=(id)=>{ let cur=id,g=0; while(cur&&g++<200){ const b=B[cur]; if(!b) return '?'; if(b.opcode==='procedures_definition'){ const pr=B[b.inputs.custom_block[1]]; return pr.mutation.proccode; } cur=b.parent; } return 'top'; };
const byProc={}; let matched=0, unmatched=0;
for(const [id,b] of Object.entries(B)){
  if(b.opcode!=='operator_or') continue;
  const ea=eqChars(b.inputs.OPERAND1),eb=eqChars(b.inputs.OPERAND2);
  if(!ea||!eb||!ea.ch||!eb.ch) continue;
  const pair=ea.ch+eb.ch;
  const isScan=(pair==='(['||pair==='[('||pair===')]'||pair==='])');
  if(!isScan) continue; matched++;
  const nm=defName(id); byProc[nm]=(byProc[nm]||0)+1;
}
console.log('scan ORs total: '+matched);
for(const [k,v] of Object.entries(byProc).sort((a,b)=>b[1]-a[1])) console.log('  '+v+'  '+k);