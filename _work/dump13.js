'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const T=n=>P.targets.find(t=>t.name===n);
function findDef(tn,pc){const t=T(tn);for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
const t=T('Interpreter');
function brief(b){
  if(!b) return 'null';
  let s=b.opcode;
  if(b.opcode==='data_itemoflist') s+='['+b.fields.LIST[0]+']';
  if(b.opcode==='data_setvariableto') s+=' '+b.fields.VARIABLE[0];
  if(b.opcode==='data_changevariableby') s+=' '+b.fields.VARIABLE[0];
  if(b.opcode==='procedures_call') s+=' <'+b.mutation.proccode+'>';
  for(const [k,v] of Object.entries(b.inputs||{})){
    if(Array.isArray(v)&&Array.isArray(v[1])&&v[1].length===2&&typeof v[1][1]==='string') s+=' '+k+'='+JSON.stringify(v[1][1]);
    else if(Array.isArray(v)&&Array.isArray(v[1])&&v[1][0]===12) s+=' '+k+'='+v[1][1];
  }
  return s;
}
const evalDef=findDef('Interpreter','eval %s %s');
console.log('=== eval top chain (def '+evalDef+') ===');
let id=t.blocks[evalDef].next, n=0;
while(id&&n<60){const b=t.blocks[id];console.log('  '+id+'  '+brief(b));id=b.next;n++;}
for(const [id,b] of Object.entries(t.blocks)){
  if(b.opcode==='procedures_call'&&b.mutation.proccode==='indexget %s %s'){
    console.log('--- indexget call',id,'parent',b.parent,'parentOp',t.blocks[b.parent]&&t.blocks[b.parent].opcode);
    const p=t.blocks[b.parent];
    for(const [k,v] of Object.entries(p.inputs||{})) console.log('    slot',k,JSON.stringify(v));
    console.log('    grandparent',p.parent,t.blocks[p.parent]&&t.blocks[p.parent].opcode);
  }
}
