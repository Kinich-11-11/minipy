'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
const vmap={}; for(const [id,v] of Object.entries(t.variables)) vmap[id]=v[0];
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function chain(start,cb){ let id=start; while(id){ cb(t.blocks[id],id); id=t.blocks[id].next; } }
console.log('--- substr body ---');
chain(t.blocks[findDef('substr %s %s %s')].next,(b,id)=>{
  let extra='';
  if(b.fields&&b.fields.VARIABLE) extra=' VAR='+b.fields.VARIABLE[0]+' id='+b.fields.VARIABLE[1]+' (declared name for that id: '+vmap[b.fields.VARIABLE[1]]+')';
  if(b.opcode==='argument_reporter_string_number') extra=' ARG='+b.fields.VALUE[0];
  if(b.opcode==='operator_letter_of') extra=' letter_of';
  console.log(id, b.opcode, extra);
  // show nested operands one level
  for(const [k,v] of Object.entries(b.inputs||{})){
    if(Array.isArray(v)&&typeof v[1]==='string'&&t.blocks[v[1]]) { const c=t.blocks[v[1]]; console.log('    ',k,'->',c.opcode, c.opcode==='argument_reporter_string_number'?('ARG='+c.fields.VALUE[0]):(c.opcode==='data_variable'?('VAR='+c.fields.VARIABLE[0]):'')); }
    else if(Array.isArray(v)&&Array.isArray(v[1])) console.log('    ',k,'-> literal',JSON.stringify(v[1]));
  }
});
