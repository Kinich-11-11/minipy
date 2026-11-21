
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const stage=p.targets.find(t=>t.isStage); const B=stage.blocks;
const bc=stage.broadcasts; // id->name
for(const id in B){ const b=B[id]; if(b.opcode==='event_broadcast'){ console.log('broadcast block', id, 'inputs', JSON.stringify(b.inputs)); } }
console.log('broadcasts', JSON.stringify(bc));
// resolve broadcast input
for(const id in B){ const b=B[id]; if(b.opcode!=='event_broadcast')continue; const inp=b.inputs.BROADCAST_INPUT;
  const walk=(v,d)=>{ if(Array.isArray(v)){ if(typeof v[1]==='string'&&bc[v[1]]) console.log('  -> broadcast id',v[1],'=',bc[v[1]]); for(const x of v) walk(x,d+1);} }; walk(inp,0); }
// Controller INIT hat + interpreter RUN hats
for(const name of ['Controller','Interpreter']){
  const t=p.targets.find(x=>x.name===name);
  for(const id in t.blocks){ const b=t.blocks[id]; if(b.opcode==='event_whenbroadcastreceived') console.log(name, id, JSON.stringify(b.fields.BROADCAST_OPTION)); }
}
// interpreter HALT hat content
const it=p.targets.find(x=>x.name==='Interpreter');
const haltId=Object.keys(it.blocks).find(id=>it.blocks[id].opcode==='event_whenbroadcastreceived'&&it.blocks[id].fields.BROADCAST_OPTION[0]==='HALT');
console.log('HALT hat', haltId, 'next', it.blocks[haltId].next, it.blocks[it.blocks[haltId].next] ? it.blocks[it.blocks[haltId].next].opcode : '');
const c=it.blocks[it.blocks[haltId].next];
if(c) console.log('  ', c.opcode, JSON.stringify(Object.fromEntries(Object.entries(c.fields||{}).map(([k,v])=>[k,v]))), JSON.stringify(c.inputs));
