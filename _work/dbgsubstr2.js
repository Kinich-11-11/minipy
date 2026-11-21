'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function show(id,ind){
  const b=t.blocks[id]; if(!b){console.log(' '.repeat(ind)+'(none)');return;}
  let extra='';
  if(b.fields&&b.fields.VARIABLE) extra=' VAR='+b.fields.VARIABLE[0]+'/'+b.fields.VARIABLE[1];
  if(b.opcode==='argument_reporter_string_number') extra=' ARG='+b.fields.VALUE[0];
  console.log(' '.repeat(ind)+id+' '+b.opcode+extra);
  for(const [k,v] of Object.entries(b.inputs||{})){
    if(Array.isArray(v)&&typeof v[1]==='string'&&t.blocks[v[1]]){ console.log(' '.repeat(ind+2)+k+':'); show(v[1],ind+4); }
    else if(Array.isArray(v)&&Array.isArray(v[1])) console.log(' '.repeat(ind+2)+k+'= lit '+JSON.stringify(v[1]));
  }
}
const subDef=findDef('substr %s %s %s');
let id=t.blocks[subDef].next;
while(id){ const b=t.blocks[id]; if(b.opcode==='control_repeat_until'){ console.log('LOOP'); show(id,0); } id=b.next; }
console.log('--- listitem substr call args ---');
const liDef=findDef('listitem %s %s');
id=t.blocks[liDef].next;
const seen=new Set(); const stack=[id];
while(stack.length){const x=stack.pop(); if(!x||seen.has(x))continue; seen.add(x); const b=t.blocks[x]; if(!b)continue;
  if(b.opcode==='procedures_call'&&b.mutation.proccode==='substr %s %s %s'){ console.log('CALL',x); for(const [k,v] of Object.entries(b.inputs)) console.log('   ',k,JSON.stringify(v)); }
  if(b.next)stack.push(b.next);
  for(const v of Object.values(b.inputs||{})){ if(!Array.isArray(v))continue; for(let i=1;i<v.length;i++) if(typeof v[i]==='string') stack.push(v[i]); }
}
