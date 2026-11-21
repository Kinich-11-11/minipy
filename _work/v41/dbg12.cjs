const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
const cu=defIdOf('calluser %s %s %s');
let id=B[cu].next, n=0;
while(id&&n<8){const b=B[id];console.log((++n)+': '+b.opcode+' '+(b.fields.VARIABLE?b.fields.VARIABLE[0]:'')+' '+(b.mutation&&b.mutation.proccode?b.mutation.proccode:''));id=b.next;}
console.log('--- types/F refs in calluser ---');
for(const i of reach(cu)){const b=B[i];
  if(b.opcode==='data_listcontainsitem') console.log('containsitem list='+b.fields.LIST[0]);
  if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode==='lookup %s') console.log('lookup call parent='+(B[b.parent]?B[b.parent].opcode:'-'));
}
