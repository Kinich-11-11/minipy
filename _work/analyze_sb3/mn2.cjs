
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=p.targets.find(x=>x.name==='MASM8086');
const mn=['ADD','OR','MOV','INT','PUSH','POP','SUB','CMP','JMP','CALL','RET','LEA','XOR','AND','NOT','INC','DEC','NOP','HLT','DB','DW'];
for(const m of mn){
  const hits=[];
  for(const id in t.blocks){ const b=t.blocks[id]; const s=JSON.stringify(b); if(s.includes('"'+m+'"')) hits.push(b.opcode+' '+s.slice(0,180)); }
  if(hits.length) console.log('### '+m+' ('+hits.length+')\n  '+hits.join('\n  '));
}
