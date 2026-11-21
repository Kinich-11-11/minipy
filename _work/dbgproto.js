'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
const want=new Set(['substr %s %s %s','listitem %s %s','listlen %s','listlit %s %s','assign %s %s %s','fail %s']);
for(const [id,b] of Object.entries(t.blocks)){
  if(b.opcode==='procedures_prototype'&&b.mutation&&want.has(b.mutation.proccode)){
    console.log(b.mutation.proccode, '| argnames', b.mutation.argumentnames, '| ids', b.mutation.argumentids);
    // which reporter belongs to which arg id
    for(const [inpName,inp] of Object.entries(b.inputs||{})){
      const rb=t.blocks[inp[1]];
      if(rb&&rb.opcode==='argument_reporter_string_number') console.log('    slot',inpName,'-> arg',rb.fields.VALUE[0]);
    }
  }
}
