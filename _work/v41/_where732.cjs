const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const hits=Object.entries(BL).filter(([id,b])=>b.opcode==='data_setvariableto'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='z7augk');
console.log('z7augk sets',hits.length);
for(const [id] of hits.slice(0,3)){
  let par=BL[id].parent, chain=[];
  while(par){const b=BL[par];chain.push(b.opcode);par=b.parent;}
  console.log(id, 'depth', chain.length, chain.slice(0,8).join(' < '));
}
// find execute def and top-level position of the insert
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
console.log('execute def', defs['execute']);
// walk top-level statements of execute
let c=BL[defs['execute']].next, g=0, top=[];
while(c&&g++<400){const b=BL[c];top.push(g+':'+b.opcode+(b.fields&&b.fields.VARIABLE?('['+b.fields.VARIABLE[0]+']'):''));c=b.next;}
console.log(top.slice(0,60).join('\n'));
